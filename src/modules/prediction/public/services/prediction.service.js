import {getPrestamosDetalle,getPrestamosAgrupadosPorPeriodoYMateria,getLoansByPeriod,getHistoricoMateriasPeriodo,getLoansBySubject,getMateriasDisponibles,getPrestamosDeMateria,} from "../../models/prediction.model.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: etiqueta legible del periodo N pasos adelante del último real.
// Secuencia fija:
//   FEB-JUL (orden 1) → AGO-ENE (orden 2, mismo año) → FEB-JUL (orden 1, año+1) → …
// ─────────────────────────────────────────────────────────────────────────────
const nextPeriodLabel = (intervalo, year, stepsAhead) => {
  let order = intervalo === "FEB-JUL" ? 1 : 2;
  let yr    = Number(year);

  for (let i = 0; i < stepsAhead; i++) {
    if (order === 1) {
      order = 2;           // FEB-JUL → AGO-ENE, mismo año
    } else {
      order = 1;           // AGO-ENE → FEB-JUL, año siguiente
      yr   += 1;
    }
  }

  return `${order === 1 ? "FEB-JUL" : "AGO-ENE"} ${yr}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: calibra el modelo exponencial P(p) = C · e^(kp)
// a partir del histórico ordenado cronológicamente.
//
// Ecuación diferencial base:   dP/dp = kP
// Solución general:            P(p)  = C · e^(kp)
//
// Calibración con el primer y último punto:
//   k = ln(PN / P0) / (pN - p0)
//   C = P0 / e^(k · p0)
// ─────────────────────────────────────────────────────────────────────────────
const buildModel = (historical) => {
  if (historical.length < 2) {
    throw new Error(
      "Se requieren al menos 2 periodos históricos para calibrar el modelo."
    );
  }

  const p0 = historical[0].periodo_num;
  const P0 = historical[0].total;
  const pN = historical[historical.length - 1].periodo_num;
  const PN = historical[historical.length - 1].total;

  const k       = Math.log(PN / P0) / (pN - p0);
  const C       = P0 / Math.exp(k * p0);
  const predict = (p) => Math.max(0, Math.round(C * Math.exp(k * p)));

  return {
    k:       Math.round(k * 10000) / 10000,
    C:       Math.round(C * 100)   / 100,
    p0, P0, pN, PN,
    predict,
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// FIG 2 — Registro de préstamos en el sistema
// GET /prediction/prestamos
// Respuesta: { prestamos: [ { id_prestamo, matricula, alumno, libro,
//              materias, fecha_prestamo, fecha_vencimiento,
//              fecha_devolucion, estado, observaciones } ] }
// ══════════════════════════════════════════════════════════════════════════════
export const servicePrestamos = async () => {
  const prestamos = await getPrestamosDetalle();
  return { prestamos };
};

// ══════════════════════════════════════════════════════════════════════════════
// FIG 3 — Organización por periodo académico con desglose por materia
// GET /prediction/agrupados
// Respuesta: { periodos: [ { label, periodo, year, orden_periodo,
//              total_periodo, materias: [ { materia, total } ] } ] }
// ══════════════════════════════════════════════════════════════════════════════
export const serviceAgrupados = async () => {
  const rows = await getPrestamosAgrupadosPorPeriodoYMateria();

  // Agrupar las filas bajo su periodo usando un Map keyed por "PERIODO YEAR"
  const map = new Map();

  for (const row of rows) {
    const key = `${row.periodo} ${row.year}`;

    if (!map.has(key)) {
      map.set(key, {
        label:         key,
        periodo:       row.periodo,
        year:          row.year,
        orden_periodo: row.orden_periodo,
        total_periodo: 0,
        materias:      [],
      });
    }

    const entry = map.get(key);
    entry.total_periodo += Number(row.total_materia);
    entry.materias.push({
      materia: row.materia,
      total:   Number(row.total_materia),
    });
  }

  return { periodos: Array.from(map.values()) };
};

// ══════════════════════════════════════════════════════════════════════════════
// FIG 4 — Representación gráfica del modelo exponencial
// GET /prediction/modelo
// Respuesta: { modelo: { tipo, ecuacion, k, C, p0, P0, pN, PN },
//              historical: [ { periodo_num, year, intervalo, total } ],
//              predictions: [ { periodo, label, valor } ],
//              chart: [ { periodo, label, valor, tipo } ] }
// ══════════════════════════════════════════════════════════════════════════════
export const serviceModelo = async () => {
  const data = await getLoansByPeriod();

  const historical = data.map((d, i) => ({
    periodo_num: i + 1,
    year:        d.year,
    intervalo:   d.periodo,
    total:       Number(d.total),
  }));

  const { k, C, p0, P0, pN, PN, predict } = buildModel(historical);
  const lastReal = historical[historical.length - 1];

  const predictions = [pN + 1, pN + 2, pN + 3].map((p, idx) => ({
    periodo: p,
    label:   nextPeriodLabel(lastReal.intervalo, lastReal.year, idx + 1),
    valor:   predict(p),
  }));

  const chart = [
    ...historical.map((h) => ({
      periodo: h.periodo_num,
      label:   `${h.intervalo} ${h.year}`,
      valor:   h.total,
      tipo:    "real",
    })),
    ...predictions.map((p) => ({
      periodo: p.periodo,
      label:   p.label,
      valor:   p.valor,
      tipo:    "prediccion",
    })),
  ];

  return {
    modelo: {
      tipo:     "exponencial",
      ecuacion: "P(p) = C · e^(kp)",
      k, C, p0, P0, pN, PN,
    },
    historical,
    predictions,
    chart,
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// FIG 5 — Visualización de datos históricos desde la BD
// GET /prediction/historico
// Respuesta: { historical: [ { periodo_num, year, intervalo, total } ],
//              crucePorMateria: [ { materia,
//                detalle: [ { periodo, total } ] } ] }
// ══════════════════════════════════════════════════════════════════════════════
export const serviceHistorico = async () => {
  const [periodoData, materiaData] = await Promise.all([
    getLoansByPeriod(),
    getHistoricoMateriasPeriodo(),
  ]);

  const historical = periodoData.map((d, i) => ({
    periodo_num: i + 1,
    year:        d.year,
    intervalo:   d.periodo,
    total:       Number(d.total),
  }));

  const periodoLabels = historical.map((h) => `${h.intervalo} ${h.year}`);

  // Construir mapa materia → { "FEB-JUL 2023": total, … }
  const cruce = {};
  for (const row of materiaData) {
    const label = `${row.periodo} ${row.year}`;
    if (!cruce[row.materia]) cruce[row.materia] = {};
    cruce[row.materia][label] = Number(row.total);
  }

  const crucePorMateria = Object.entries(cruce).map(([materia, periodos]) => ({
    materia,
    detalle: periodoLabels.map((label) => ({
      periodo: label,
      total:   periodos[label] ?? 0,
    })),
  }));

  return { historical, crucePorMateria };
};

// ══════════════════════════════════════════════════════════════════════════════
// FIG 6 — Predicción total de préstamos (3 periodos futuros)
// GET /prediction/total
// Respuesta: { resumen: { total_periodos, ultimo_periodo, promedio_historico,
//                tendencia, k, C },
//              predictions: [ { periodo, label, valor, formula } ] }
// ══════════════════════════════════════════════════════════════════════════════
export const servicePrediccionTotal = async () => {
  const data = await getLoansByPeriod();

  const historical = data.map((d, i) => ({
    periodo_num: i + 1,
    year:        d.year,
    intervalo:   d.periodo,
    total:       Number(d.total),
  }));

  const { k, C, p0, P0, pN, PN, predict } = buildModel(historical);
  const lastReal = historical[historical.length - 1];

  const promedio = Math.round(
    historical.reduce((acc, h) => acc + h.total, 0) / historical.length
  );

  const predictions = [pN + 1, pN + 2, pN + 3].map((p, idx) => ({
    periodo: p,
    label:   nextPeriodLabel(lastReal.intervalo, lastReal.year, idx + 1),
    valor:   predict(p),
    formula: `${C} · e^(${k} × ${p})`,
  }));

  return {
    resumen: {
      total_periodos:     historical.length,
      ultimo_periodo:     {
        label: `${lastReal.intervalo} ${lastReal.year}`,
        total:  lastReal.total,
      },
      promedio_historico: promedio,
      tendencia:          k >= 0 ? "creciente" : "decreciente",
      k,
      C,
    },
    predictions,
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// FIG 7 — Materias disponibles (selector del frontend)
// GET /prediction/materia
// Respuesta: { materias: [ { id, materia } ] }
// ══════════════════════════════════════════════════════════════════════════════
export const serviceMateriasDisponibles = async () => {
  const materias = await getMateriasDisponibles();
  return { materias };
};

// ══════════════════════════════════════════════════════════════════════════════
// FIG 7 — Préstamos y predicción de una materia específica
// GET /prediction/materia?nombre=X
// Respuesta: { materia, total_historico, porcentaje,
//              prestamos: [ { id_prestamo, matricula, alumno, libro,
//                materia, year, periodo, fecha_prestamo,
//                fecha_vencimiento, fecha_devolucion, estado } ],
//              predicciones: [ { periodo, label, valor_estimado } ] }
// ══════════════════════════════════════════════════════════════════════════════
export const servicePorMateria = async (nombreMateria) => {
  const [prestamos, periodoData, subjectsRaw] = await Promise.all([
    getPrestamosDeMateria(nombreMateria),
    getLoansByPeriod(),
    getLoansBySubject(),
  ]);

  const historical = periodoData.map((d, i) => ({
    periodo_num: i + 1,
    year:        d.year,
    intervalo:   d.periodo,
    total:       Number(d.total),
  }));

  const { k, C, pN, predict } = buildModel(historical);
  const lastReal = historical[historical.length - 1];

  // Porcentaje de participación de esta materia sobre el total histórico global
  const totalHistorico = subjectsRaw.reduce((acc, s) => acc + Number(s.total), 0);
  const thisSubject    = subjectsRaw.find((s) => s.materia === nombreMateria);
  const totalMateria   = thisSubject ? Number(thisSubject.total) : 0;
  const porcentaje     = totalHistorico > 0
    ? Math.round((totalMateria / totalHistorico) * 10000) / 100
    : 0;

  // Predicciones proporcionales al porcentaje de participación de la materia
  const predicciones = [pN + 1, pN + 2, pN + 3].map((p, idx) => ({
    periodo:        p,
    label:          nextPeriodLabel(lastReal.intervalo, lastReal.year, idx + 1),
    valor_estimado: Math.max(0, Math.round((porcentaje / 100) * predict(p))),
  }));

  return {
    materia:         nombreMateria,
    total_historico: totalMateria,
    porcentaje,
    prestamos,
    predicciones,
  };
};