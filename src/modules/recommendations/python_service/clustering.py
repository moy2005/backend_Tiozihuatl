import numpy as np
import warnings


def predict_book_clusters(artifact, records):
    """Valida el esquema y ejecuta el Pipeline real para cada libro."""
    variables = artifact["variables_x"]
    if not isinstance(records, list) or not records:
        raise ValueError("Se requiere al menos un libro para segmentar.")

    missing = [
        column
        for column in ["libro_id", *variables]
        if any(column not in record for record in records)
    ]
    if missing:
        raise ValueError("Faltan variables: " + ", ".join(missing))

    try:
        values = np.asarray(
            [[float(record[column]) for column in variables] for record in records],
            dtype=float,
        )
    except (TypeError, ValueError) as error:
        raise ValueError("Las variables del clustering deben ser numéricas y completas.") from error

    if not np.isfinite(values).all():
        raise ValueError("Las variables del clustering deben ser numéricas y completas.")

    # El orden ya fue validado contra variables_x; se evita depender de pandas
    # dentro del microservicio solo para conservar nombres de columnas.
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message="X does not have valid feature names")
        labels = artifact["pipeline"].predict(values)
    names = artifact["nombres_cluster"]

    return [
        {
            "book_id": int(book_id),
            "cluster": int(cluster),
            "profile_name": names[int(cluster)],
        }
        for record, cluster in zip(records, labels)
        for book_id in [record["libro_id"]]
    ]
