import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { poolPromise } from "../../src/config/db.config.js";

const outputPath = resolve(
  process.argv[2] || "../dataset_apriori_completo_tiozihuatl.csv"
);

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const toIsoWeek = (dateValue) => {
  const date = new Date(`${dateValue}T00:00:00Z`);
  const target = new Date(date);
  target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
  const weekOne = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((target.getTime() - weekOne.getTime()) / 86400000 - 3 + ((weekOne.getUTCDay() + 6) % 7)) / 7
  );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

try {
  const [databaseRows] = await poolPromise.query("SELECT DATABASE() AS name");
  if (databaseRows[0]?.name !== "bd_tiozi") {
    throw new Error(`Se esperaba bd_tiozi y se recibió ${databaseRows[0]?.name || "ninguna base"}.`);
  }

  const [books] = await poolPromise.query(
    "SELECT id, titulo FROM libros WHERE activo = 1 ORDER BY id"
  );
  const [interactions] = await poolPromise.query(`
    SELECT
      i.id_usuario,
      DATE_FORMAT(DATE_SUB(DATE(i.fecha_hora), INTERVAL WEEKDAY(i.fecha_hora) DAY), '%Y-%m-%d') AS semana_inicio,
      i.libro_id,
      l.titulo
    FROM interacciones_libros i
    INNER JOIN libros l ON l.id = i.libro_id AND l.activo = 1
    GROUP BY i.id_usuario, semana_inicio, i.libro_id, l.titulo
    ORDER BY i.id_usuario, semana_inicio, i.libro_id
  `);

  const bookIndex = new Map(books.map((book, index) => [Number(book.id), index]));
  const baskets = new Map();

  for (const interaction of interactions) {
    const key = `${interaction.id_usuario}|${interaction.semana_inicio}`;
    const basket = baskets.get(key) || {
      idUsuario: Number(interaction.id_usuario),
      weekStart: interaction.semana_inicio,
      bookIds: new Set(),
    };
    basket.bookIds.add(Number(interaction.libro_id));
    baskets.set(key, basket);
  }

  const metadataHeaders = [
    "transaccion_id",
    "id_usuario",
    "semana_id",
    "semana_inicio",
    "n_libros",
    "libros_canasta",
  ];
  const lines = [
    [...metadataHeaders, ...books.map((book) => book.titulo)].map(csvCell).join(","),
  ];

  for (const basket of baskets.values()) {
    const selected = [...basket.bookIds]
      .filter((id) => bookIndex.has(id))
      .sort((a, b) => bookIndex.get(a) - bookIndex.get(b));
    if (!selected.length) continue;

    const weekId = toIsoWeek(basket.weekStart);
    const titles = selected.map((id) => books[bookIndex.get(id)].titulo);
    const binary = Array(books.length).fill(0);
    for (const id of selected) binary[bookIndex.get(id)] = 1;

    lines.push([
      `${basket.idUsuario}-${weekId}`,
      basket.idUsuario,
      weekId,
      basket.weekStart,
      selected.length,
      titles.join(" | "),
      ...binary,
    ].map(csvCell).join(","));
  }

  await writeFile(outputPath, `\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
  console.log(JSON.stringify({
    database: databaseRows[0].name,
    output: outputPath,
    transactions: lines.length - 1,
    activeBookColumns: books.length,
    distinctInteractionRows: interactions.length,
  }, null, 2));
} finally {
  await poolPromise.end();
}
