from waitress import serve

from .app import create_app
from .artifact_builder import build_artifact
from .config import ARTIFACT_PATH, load_env_file


load_env_file()
if not ARTIFACT_PATH.exists():
    build_artifact()
application = create_app()


if __name__ == "__main__":
    serve(
        application,
        host="127.0.0.1",
        port=5055,
        threads=4,
    )
