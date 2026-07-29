import math

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def recommend_books(artifact, book_id, limit=5):
    # 1. Obtener la matriz binaria y localizar el libro buscado.
    matriz = artifact["matrix_binary"]
    ids_libros = artifact["book_ids"]
    indice_libros = artifact["book_index"]
    book_id = int(book_id)

    if book_id not in indice_libros:
        raise KeyError(book_id)

    posicion_buscado = indice_libros[book_id]
    vector_buscado = matriz[posicion_buscado]

    if not np.any(vector_buscado):
        return []

    # 2. Calcular la similitud como en la libreta de Jupyter.
    similitudes = cosine_similarity(
        matriz,
        vector_buscado.reshape(1, -1),
    ).ravel()

    # 3. Formar el resultado. Una similitud de 0 no se recomienda.
    nombres_caracteristicas = artifact["feature_names"]
    etiquetas_caracteristicas = artifact["feature_labels"]
    recommendations = []

    for posicion, similitud in enumerate(similitudes):
        if posicion == posicion_buscado or similitud <= 0:
            continue

        vector_candidato = matriz[posicion]
        columnas_compartidas = np.where(
            (vector_buscado == 1) & (vector_candidato == 1)
        )[0]
        caracteristicas_compartidas = [
            etiquetas_caracteristicas[nombres_caracteristicas[columna]]
            for columna in columnas_compartidas
        ]
        similitud = float(np.clip(similitud, 0, 1))

        recommendations.append(
            {
                "book_id": int(ids_libros[posicion]),
                "cosine_similarity": round(similitud, 6),
                "angle_degrees": round(
                    math.degrees(math.acos(similitud)),
                    2,
                ),
                "shared_feature_count": len(
                    caracteristicas_compartidas
                ),
                "shared_features": caracteristicas_compartidas,
            }
        )

    # 4. Ordenar de mayor a menor similitud y devolver el Top 5.
    recommendations.sort(
        key=lambda book: (
            -book["cosine_similarity"],
            book["book_id"],
        )
    )
    safe_limit = min(max(int(limit), 1), 20)
    return recommendations[:safe_limit]
