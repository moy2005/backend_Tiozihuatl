import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve("../resultados_apriori_mejorado/association-rules.json");
const destinationPath = resolve("src/modules/recommendations/data/association-rules.json");
const artifact = JSON.parse(await readFile(sourcePath, "utf8"));

if (
  artifact.modelType !== "association_rules_apriori"
  || !Array.isArray(artifact.rules)
  || artifact.rules.length === 0
) {
  throw new Error("El artefacto Apriori no tiene el esquema esperado o no contiene reglas.");
}

await writeFile(destinationPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  source: sourcePath,
  destination: destinationPath,
  transactions: artifact.trainingSummary.transactions,
  books: artifact.trainingSummary.uniqueBooks,
  rules: artifact.rules.length,
}, null, 2));
