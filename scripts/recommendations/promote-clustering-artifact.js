import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(process.argv[2] || "../data_mining/resultados_clustering_libros/libros_con_cluster.csv");
const target = resolve("src/modules/recommendations/data/book-clusters.json");

const parseCsv = (text) => {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
};

const [headers, ...values] = parseCsv(readFileSync(source, "utf8").replace(/^\uFEFF/, ""));
const records = values.map((valuesRow) => Object.fromEntries(headers.map((header, index) => [header, valuesRow[index]])));
const books = records.map((row) => ({
  bookId: Number(row.libro_id), title: row.titulo, cluster: Number(row.cluster), profile: row.nombre_cluster,
  metrics: {
    readingSessions: Number(row.total_sesiones_lectura), uniqueReaders: Number(row.usuarios_unicos_lectores),
    averageReadingSeconds: Number(row.promedio_tiempo_segundos), averageProgressPercent: Number(row.porcentaje_promedio_avance),
    physicalLoans: Number(row.total_prestamos_fisicos),
  },
}));

if (!books.length || books.some((book) => !Number.isInteger(book.bookId) || !book.title || ![0, 1, 2].includes(book.cluster))) {
  throw new Error("El CSV de clustering no contiene asignaciones validas.");
}

const artifact = {
  schemaVersion: 1, modelType: "KMeans", k: 3, generatedAt: new Date().toISOString(),
  features: ["total_sesiones_lectura", "usuarios_unicos_lectores", "promedio_tiempo_segundos", "porcentaje_promedio_avance", "total_prestamos_fisicos"],
  validation: { silhouette: 0.7315, daviesBouldin: 0.5002, calinskiHarabasz: 304.0007 },
  profiles: {
    "0": { name: "Baja utilización", studentLabel: "Descubre nuevos recursos", description: "Libros con poca actividad registrada que pueden ampliar tus fuentes de consulta.", icon: "sparkles-outline" },
    "1": { name: "Consulta rápida", studentLabel: "Consulta frecuente", description: "Libros que otros estudiantes consultan para localizar información puntual.", icon: "flash-outline" },
    "2": { name: "Estudio intensivo", studentLabel: "Para profundizar", description: "Libros con lecturas más prolongadas y mayor avance para estudiar un tema a fondo.", icon: "school-outline" },
  },
  books,
};

writeFileSync(target, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(`Artefacto generado: ${target} (${books.length} libros)`);
