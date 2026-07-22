# Recomendaciones bibliográficas con Apriori

El módulo utiliza exclusivamente reglas de asociación generadas con Apriori.
No aplica recomendaciones por materia, semestre, autor o popularidad.

Una recomendación solo se devuelve cuando:

- El título actual satisface el antecedente de una regla.
- En antecedentes de dos libros, el título actual es uno de ellos y el otro
  aparece en el historial real del usuario.
- El consecuente es un único libro distinto del actual.
- El libro consecuente está activo y disponible en el catálogo.
- La regla supera los umbrales de soporte, confianza y lift de la libreta.

## Actualización de reglas

Desde `backend_Tiozihuatl`:

```powershell
npm run recommendations:dataset
cd ..
jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.timeout=600 "Reglas_Asociacion_Apriori_Tiozihuatl (1).ipynb"
cd backend_Tiozihuatl
npm run recommendations:promote
npm run test:recommendations
```

El único artefacto utilizado por producción es `association-rules.json`. La tabla
`interacciones_libros` es la fuente histórica real y no debe llenarse con datos
ficticios para forzar reglas.
# Recomendaciones y perfiles de lectura

Este módulo mantiene dos técnicas independientes:

- **Reglas Apriori:** recomendaciones asociadas con el libro que el estudiante está leyendo.
- **Clustering K-Means:** rutas de exploración del catálogo según tres comportamientos globales: consulta rápida, estudio intensivo y baja utilización.

## Flujo de clustering

La libreta y `build_clustering_libros_dataset.py` se usan fuera del servidor para preparar, evaluar y entrenar el modelo. El backend no ejecuta Jupyter en cada petición. El resultado aprobado se promueve con:

```bash
npm run recommendations:clusters
```

El comando convierte `resultados_clustering_libros/libros_con_cluster.csv` en el artefacto versionado `data/book-clusters.json`. El endpoint autenticado `GET /api/recommendations/clusters/student` cruza esas asignaciones con el catálogo activo y su disponibilidad actual.

Para actualizar el modelo: regenerar el dataset, ejecutar la libreta, revisar Silhouette/Davies-Bouldin/Calinski-Harabasz y finalmente promover el nuevo CSV. El artefacto permite desplegar Node sin Python, pandas ni scikit-learn.
