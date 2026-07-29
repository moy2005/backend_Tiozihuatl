# Recomendación de libros basada en contenido

La recomendación asociada con el detalle de un libro utiliza exclusivamente:

- Materias del libro.
- Autores del libro.
- Vectores binarios.
- Similitud coseno.

No utiliza interacciones de usuarios, préstamos, TF-IDF ni reglas de
asociación. Semestres y formatos se muestran como metadatos, pero no forman
parte del vector.

## Arquitectura

Angular solicita:

```text
GET /api/recommendations/books/:id?limit=5
```

Express conserva la autenticación y consulta la disponibilidad actual. Dentro
del mismo servidor de Render, el proceso Python carga
`data/content-recommender.joblib`, calcula el ranking y devuelve
identificadores, similitudes y características compartidas.

El artefacto contiene los identificadores del catálogo, el índice de libros,
las características y la matriz binaria. No contiene resultados escritos
manualmente.

El procedimiento principal está en
`python_service/engine.py`. En ese archivo se muestran directamente:

1. El vector binario del libro buscado.
2. El producto punto.
3. Las normas de los vectores.
4. La división `(A · B) / (||A|| * ||B||)`.
5. El ordenamiento de las recomendaciones.

## Preparación

Desde `backend_Tiozihuatl`:

```powershell
python -m pip install -r src/modules/recommendations/python_service/requirements.txt
npm run recommendations:rebuild
```

## Ejecución local

Para iniciar Express y Python juntos:

```powershell
cd backend_Tiozihuatl
npm start
```

Durante el desarrollo también pueden iniciarse por separado:

```powershell
npm run recommendations:service
npm run dev
```

Express utiliza el puerto público proporcionado por Render. Python escucha
solamente en `127.0.0.1:5055`, dentro del mismo servidor, por lo que no tiene
una URL pública ni necesita variables nuevas. Ambos procesos reutilizan las
mismas variables de base de datos del backend actual.

Al ejecutar `npm install`, también se instalan automáticamente las
dependencias de Python indicadas en `python_service/requirements.txt`.

## Actualización

Después de crear, actualizar, activar, desactivar o eliminar un libro, Express
solicita una reconstrucción del artefacto. El proceso:

1. Consulta el catálogo activo desde MySQL.
2. Reconstruye los vectores.
3. Guarda un archivo temporal.
4. Reemplaza el artefacto anterior solamente al finalizar correctamente.
5. El servicio Python detecta la nueva versión al atender la siguiente
   solicitud.

Si el servicio Python se encuentra detenido, la operación administrativa del
catálogo se conserva y el artefacto puede regenerarse posteriormente con:

```powershell
npm run recommendations:rebuild
```

## Pruebas

```powershell
npm run test:recommendations
```

El módulo de clustering permanece independiente como la otra solución
analítica del proyecto.
