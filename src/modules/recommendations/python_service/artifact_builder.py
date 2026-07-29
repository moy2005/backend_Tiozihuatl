import hashlib
import json
import os
from datetime import datetime, timezone

import joblib
import numpy as np

from .config import ARTIFACT_PATH, MANIFEST_PATH, get_database_connection


def read_catalog():
    connection = get_database_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, titulo
                FROM libros
                WHERE activo = 1
                ORDER BY id
                """
            )
            books = cursor.fetchall()

            cursor.execute(
                """
                SELECT la.libro_id, a.id AS autor_id, a.nombre
                FROM libro_autor la
                INNER JOIN autores a ON a.id = la.autor_id
                INNER JOIN libros l ON l.id = la.libro_id
                WHERE l.activo = 1
                ORDER BY la.libro_id, a.id
                """
            )
            authors = cursor.fetchall()

            cursor.execute(
                """
                SELECT lm.libro_id, m.id AS materia_id, m.nombre
                FROM libro_materia lm
                INNER JOIN materias m ON m.id = lm.materia_id
                INNER JOIN libros l ON l.id = lm.libro_id
                WHERE l.activo = 1
                ORDER BY lm.libro_id, m.id
                """
            )
            subjects = cursor.fetchall()
    finally:
        connection.close()

    return books, authors, subjects


def create_artifact(books, authors, subjects):
    features_by_book = {int(book["id"]): set() for book in books}
    feature_labels = {}

    for author in authors:
        key = f"autor:{int(author['autor_id'])}"
        features_by_book[int(author["libro_id"])].add(key)
        feature_labels[key] = f"Autor: {author['nombre']}"

    for subject in subjects:
        key = f"materia:{int(subject['materia_id'])}"
        features_by_book[int(subject["libro_id"])].add(key)
        feature_labels[key] = f"Materia: {subject['nombre']}"

    book_ids = np.array([int(book["id"]) for book in books], dtype=np.int64)
    feature_names = sorted(feature_labels)
    feature_index = {
        feature_name: position
        for position, feature_name in enumerate(feature_names)
    }

    matrix = np.zeros(
        (len(book_ids), len(feature_names)),
        dtype=np.float32,
    )

    for row, book_id in enumerate(book_ids):
        columns = [
            feature_index[feature]
            for feature in features_by_book[int(book_id)]
        ]
        matrix[row, columns] = 1.0

    norms = np.linalg.norm(matrix, axis=1)

    catalog_signature = [
        {
            "book_id": int(book_id),
            "features": sorted(features_by_book[int(book_id)]),
        }
        for book_id in book_ids
    ]
    fingerprint = hashlib.sha256(
        json.dumps(
            catalog_signature,
            ensure_ascii=False,
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()

    generated_at = datetime.now(timezone.utc).isoformat()
    empty_books = [
        int(book_ids[row])
        for row in np.flatnonzero(norms == 0)
    ]

    return {
        "schema_version": 2,
        "model_type": "content_based",
        "similarity": "cosine",
        "generated_at": generated_at,
        "catalog_fingerprint": fingerprint,
        "parameters": {
            "top_k": 5,
            "maximum_candidates": 20,
            "minimum_similarity": 0.0,
            "feature_groups": ["materia", "autor"],
            "feature_weighting": "binary_equal_weight",
        },
        "book_ids": book_ids,
        "book_index": {
            int(book_id): position
            for position, book_id in enumerate(book_ids)
        },
        "feature_names": feature_names,
        "feature_labels": feature_labels,
        "matrix_binary": matrix,
        "quality": {
            "book_count": int(len(book_ids)),
            "feature_count": int(len(feature_names)),
            "empty_book_ids": empty_books,
        },
    }


def save_artifact(artifact, artifact_path=ARTIFACT_PATH):
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = artifact_path.with_suffix(".joblib.tmp")
    manifest_path = artifact_path.with_suffix(".json")
    temporary_manifest = manifest_path.with_suffix(".json.tmp")

    joblib.dump(artifact, temporary_path, compress=3)
    os.replace(temporary_path, artifact_path)

    manifest = {
        "schema_version": artifact["schema_version"],
        "model_type": artifact["model_type"],
        "similarity": artifact["similarity"],
        "generated_at": artifact["generated_at"],
        "catalog_fingerprint": artifact["catalog_fingerprint"],
        "parameters": artifact["parameters"],
        "quality": artifact["quality"],
        "artifact_file": artifact_path.name,
    }
    temporary_manifest.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    os.replace(temporary_manifest, manifest_path)

    return artifact_path


def build_artifact():
    books, authors, subjects = read_catalog()
    artifact = create_artifact(books, authors, subjects)
    save_artifact(artifact)
    return artifact


if __name__ == "__main__":
    result = build_artifact()
    print(
        json.dumps(
            {
                "artifact": str(ARTIFACT_PATH),
                "manifest": str(MANIFEST_PATH),
                "generated_at": result["generated_at"],
                **result["quality"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
