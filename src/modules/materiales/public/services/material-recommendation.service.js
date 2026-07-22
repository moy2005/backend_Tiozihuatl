import { readFileSync } from 'node:fs';
import { poolOperacion as poolConsulta } from '../../../../config/dbPools/poolOperacion.config.js';

const rulesFile = new URL('../../data/reglas_apriori_materiales.json', import.meta.url);
const model = JSON.parse(readFileSync(rulesFile, 'utf8'));

const normalize = (value) => String(value ?? '').trim().normalize('NFC');

export const MaterialRecommendationService = {
  async getByMaterialId(idMaterial, limit = 3, historyIds = []) {
    const [baseRows] = await poolConsulta.query(
      `SELECT id_material, titulo
       FROM materiales
       WHERE id_material = ? AND activo = 1 AND visibilidad = 'PUBLICO'
       LIMIT 1`,
      [idMaterial]
    );

    if (!baseRows.length) return null;
    
    const base = baseRows[0];
    const baseTitle = normalize(base.titulo);
    const safeHistoryIds = [...new Set(
      historyIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    )].slice(-10);

    const contextIds = [...new Set([...safeHistoryIds, Number(idMaterial)])];
    const [contextMaterials] = await poolConsulta.query(
      `SELECT id_material, titulo
       FROM materiales
       WHERE activo = 1 AND visibilidad = 'PUBLICO' AND id_material IN (?)`,
      [contextIds]
    );

    const contextTitles = new Set(contextMaterials.map((item) => normalize(item.titulo)));
    contextTitles.add(baseTitle);

    const matchingRules = model.rules
      .filter((rule) =>
        Array.isArray(rule.antecedents)
        && rule.antecedents.some((title) => normalize(title) === baseTitle)
        && rule.antecedents.every((title) => contextTitles.has(normalize(title)))
        && !contextTitles.has(normalize(rule.consequent))
      )
      .sort((a, b) => {
        const evidenceA = a.evidence === 'CONSOLIDADA' ? 1 : 0;
        const evidenceB = b.evidence === 'CONSOLIDADA' ? 1 : 0;
        return Number(b.antecedents.length) - Number(a.antecedents.length)
          || evidenceB - evidenceA
          || Number(b.score) - Number(a.score);
      });

    const uniqueRules = [];
    const seen = new Set();
    for (const rule of matchingRules) {
      const title = normalize(rule.consequent);
      if (!title || seen.has(title)) continue;
      seen.add(title);
      uniqueRules.push(rule);
      if (uniqueRules.length >= limit) break;
    }

    if (!uniqueRules.length) {
      return {
        material: base,
        recommendations: [],
        model: model.trainingSummary,
      };
    }

    const titles = uniqueRules.map((rule) => normalize(rule.consequent));
    const [materials] = await poolConsulta.query(
      `SELECT
         m.id_material,
         m.titulo,
         m.descripcion,
         m.tipo,
         m.url,
         m.public_id,
         m.fecha_creacion,
         u.nombre AS nombre_docente,
         GROUP_CONCAT(DISTINCT mat.nombre ORDER BY mat.nombre SEPARATOR ', ') AS materias,
         GROUP_CONCAT(DISTINCT s.nombre_semestre ORDER BY s.id_semestre SEPARATOR ', ') AS semestres
       FROM materiales m
       JOIN usuarios u ON u.id_usuario = m.id_usuario
       LEFT JOIN material_materia mm ON mm.id_material = m.id_material
       LEFT JOIN materias mat ON mat.id = mm.id_materia
       LEFT JOIN material_semestre ms ON ms.id_material = m.id_material
       LEFT JOIN semestres s ON s.id_semestre = ms.id_semestre
       WHERE m.activo = 1 AND m.visibilidad = 'PUBLICO' AND m.titulo IN (?)
       GROUP BY m.id_material`,
      [titles]
    );

    const byTitle = new Map(materials.map((material) => [normalize(material.titulo), material]));
    const recommendations = uniqueRules
      .map((rule) => {
        const material = byTitle.get(normalize(rule.consequent));
        if (!material) return null;
        return {
          ...material,
          metrics: {
            support: Number(rule.support),
            confidence: Number(rule.confidence),
            lift: Number(rule.lift),
            transactionCount: Number(rule.transactionCount),
            score: Number(rule.score),
            evidence: rule.evidence,
          },
        };
      })
      .filter(Boolean);

    return {
      material: base,
      recommendations,
      model: model.trainingSummary,
    };
  },
};
