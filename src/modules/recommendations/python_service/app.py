import os
from pathlib import Path
from threading import RLock

import joblib
from flask import Flask, jsonify, request

from .artifact_builder import build_artifact
from .config import ARTIFACT_PATH, load_env_file
from .engine import recommend_books


class ArtifactStore:
    def __init__(self, artifact_path=ARTIFACT_PATH):
        self.artifact_path = Path(artifact_path)
        self.artifact = None
        self.modified_at = None
        self.lock = RLock()

    def load(self, force=False):
        with self.lock:
            if not self.artifact_path.exists():
                raise FileNotFoundError(self.artifact_path)

            modified_at = self.artifact_path.stat().st_mtime_ns
            if (
                force
                or self.artifact is None
                or modified_at != self.modified_at
            ):
                self.artifact = joblib.load(self.artifact_path)
                self.modified_at = modified_at

            return self.artifact


def create_app():
    load_env_file()
    app = Flask(__name__)
    store = ArtifactStore()

    def valid_internal_token():
        expected = os.getenv("RECOMMENDER_SERVICE_TOKEN", "")
        if not expected:
            return True
        return request.headers.get("X-Recommender-Token", "") == expected

    @app.get("/health")
    def health():
        try:
            artifact = store.load()
        except FileNotFoundError:
            return jsonify(
                {
                    "status": "not_ready",
                    "message": "El artefacto todavía no existe.",
                }
            ), 503

        return jsonify(
            {
                "status": "ok",
                "model_type": artifact["model_type"],
                "similarity": artifact["similarity"],
                "generated_at": artifact["generated_at"],
                "book_count": artifact["quality"]["book_count"],
            }
        )

    @app.get("/internal/recommendations/books/<int:book_id>")
    def recommendations_for_book(book_id):
        if not valid_internal_token():
            return jsonify({"message": "Acceso no autorizado."}), 401

        limit = min(max(request.args.get("limit", 20, type=int), 1), 20)

        try:
            artifact = store.load()
            recommendations = recommend_books(
                artifact,
                book_id,
                limit,
            )
        except FileNotFoundError:
            return jsonify(
                {"message": "El artefacto no está disponible."}
            ), 503
        except KeyError:
            artifact = build_artifact()
            store.load(force=True)
            try:
                recommendations = recommend_books(
                    artifact,
                    book_id,
                    limit,
                )
            except KeyError:
                return jsonify(
                    {
                        "message": (
                            "El libro no forma parte del catálogo "
                            "activo del recomendador."
                        )
                    }
                ), 404

        return jsonify(
            {
                "source_book_id": book_id,
                "model": {
                    "type": artifact["model_type"],
                    "similarity": artifact["similarity"],
                    "schema_version": artifact["schema_version"],
                    "generated_at": artifact["generated_at"],
                    "catalog_fingerprint": artifact[
                        "catalog_fingerprint"
                    ],
                },
                "recommendations": recommendations,
            }
        )

    @app.post("/internal/rebuild")
    def rebuild():
        if not valid_internal_token():
            return jsonify({"message": "Acceso no autorizado."}), 401

        artifact = build_artifact()
        store.load(force=True)

        return jsonify(
            {
                "message": "Artefacto actualizado correctamente.",
                "generated_at": artifact["generated_at"],
                **artifact["quality"],
            }
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception("Error del recomendador", exc_info=error)
        return jsonify(
            {"message": "Error interno del recomendador."}
        ), 500

    return app
