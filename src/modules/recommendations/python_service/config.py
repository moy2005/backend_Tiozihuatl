import os
import ssl
from pathlib import Path

import pymysql


SERVICE_DIR = Path(__file__).resolve().parent
MODULE_DIR = SERVICE_DIR.parent
BACKEND_DIR = Path(__file__).resolve().parents[4]
ENV_PATH = BACKEND_DIR / ".env"
ARTIFACT_PATH = MODULE_DIR / "data" / "content-recommender.joblib"
CLUSTERING_ARTIFACT_PATH = MODULE_DIR / "data" / "clustering_libros_mensual.joblib"
MANIFEST_PATH = ARTIFACT_PATH.with_suffix(".json")


def load_env_file(path=ENV_PATH):
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def get_database_connection():
    load_env_file()

    required = ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME"]
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise RuntimeError(
            "Faltan variables de base de datos: " + ", ".join(missing)
        )

    options = {
        "host": os.environ["DB_HOST"],
        "user": os.environ["DB_USER"],
        "password": os.environ["DB_PASS"],
        "database": os.environ["DB_NAME"],
        "port": int(os.getenv("DB_PORT", "3306")),
        "charset": "utf8mb4",
        "connect_timeout": 10,
        "read_timeout": 30,
        "write_timeout": 30,
        "cursorclass": pymysql.cursors.DictCursor,
    }

    certificate = os.getenv("DB_SSL_CA", "").replace("\\n", "\n").strip()
    if certificate:
        context = ssl.create_default_context(cadata=certificate)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        options["ssl"] = context

    return pymysql.connect(**options)
