import { poolAdmin }     from '../../../config/dbPools/poolAdmin.config.js';
import { poolOperacion } from '../../../config/dbPools/poolOperacion.config.js';

const TABLAS_MANTENIMIENTO = [
  'tokensrefresh',
  'sesionesjwt',
  'auditoriaeventos',
  'usuarios',
  'prestamos',
  'libros',
  'trayectoria_academica'
];

const getNowMexico = () =>
  new Date()
    .toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' })
    .replace('T', ' ')
    .slice(0, 19);

export const runMaintenance = async (origen = 'manual', userId = null) => {
  const startTime  = Date.now();
  const logLines   = [];
  const detalle    = [];
  let tablas_ok    = 0;
  let tablas_error = 0;

  const log = (msg) => {
    const line = `[${getNowMexico()}] ${msg}`;
    logLines.push(line);
  };

  log('===== INICIO DE OPTIMIZACIÓN DE RENDIMIENTO =====');
  log(`Tablas a procesar: ${TABLAS_MANTENIMIENTO.length}`);

  for (const tabla of TABLAS_MANTENIMIENTO) {
    const resultadoTabla = { tabla, analyze: null, optimize: null, error: null };
    log(`→ Procesando: ${tabla}`);
    try {
      const [analyzeRows] = await poolAdmin.execute(`ANALYZE TABLE \`${tabla}\``);
      const analyzeStatus = analyzeRows[analyzeRows.length - 1]?.Msg_text ?? 'OK';
      resultadoTabla.analyze = analyzeStatus;
      log(`   Estadísticas actualizadas: ${analyzeStatus}`);

      const [optimizeRows] = await poolAdmin.execute(`OPTIMIZE TABLE \`${tabla}\``);
      const optimizeStatus = optimizeRows[optimizeRows.length - 1]?.Msg_text ?? 'OK';
      resultadoTabla.optimize = optimizeStatus;
      log(`   Índices reorganizados: ${optimizeStatus}`);

      tablas_ok++;
    } catch (err) {
      resultadoTabla.error = err.message;
      log(`   ERROR: ${err.message}`);
      tablas_error++;
    }
    detalle.push(resultadoTabla);
  }

  const duracion = ((Date.now() - startTime) / 1000).toFixed(2);
  log('===== FIN DE OPTIMIZACIÓN =====');
  log(`Resultado: ${tablas_ok} exitosas, ${tablas_error} con error — ${duracion}s`);

  const [result] = await poolOperacion.execute(
    `INSERT INTO maintenance_log
     (origen, tablas_procesadas, tablas_ok, tablas_error,
      duracion_seg, ejecutado_por, detalle_json, log_texto, fecha)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      origen,
      TABLAS_MANTENIMIENTO.length,
      tablas_ok,
      tablas_error,
      parseFloat(duracion),
      userId,
      JSON.stringify(detalle),
      logLines.join('\n'),
      getNowMexico()
    ]
  );

  return {
    id:                result.insertId,
    tablas_procesadas: TABLAS_MANTENIMIENTO.length,
    tablas_ok,
    tablas_error,
    duracion_seg:      duracion,
    detalle
  };
};


export const getMaintenanceStatus = async () => {
  const [rows] = await poolOperacion.execute(
    `SELECT id_log, origen, tablas_procesadas, tablas_ok, tablas_error,
            duracion_seg, ejecutado_por,
            DATE_FORMAT(fecha, '%Y-%m-%dT%H:%i:%s') AS fecha
     FROM maintenance_log ORDER BY fecha DESC LIMIT 1`
  );
  const ultimo = rows[0] ?? null;

  if (!ultimo) {
    return { estado: 'danger', mensaje: 'Nunca se ha ejecutado un mantenimiento.', ultimo: null };
  }

  const diasPasados = Math.floor(
    (new Date() - new Date(ultimo.fecha)) / (1000 * 60 * 60 * 24)
  );

  let estado, mensaje;
  if (diasPasados <= 7) {
    estado  = 'success';
    mensaje = `El sistema está en buen estado. Último mantenimiento hace ${diasPasados} día(s).`;
  } else if (diasPasados <= 14) {
    estado  = 'warning';
    mensaje = `Se recomienda ejecutar mantenimiento. Han pasado ${diasPasados} días.`;
  } else {
    estado  = 'danger';
    mensaje = `Mantenimiento requerido. Llevan ${diasPasados} días sin optimización.`;
  }

  return { estado, mensaje, diasPasados, ultimo };
};

export const getMaintenanceLogs = async () => {
  const [rows] = await poolOperacion.execute(
    `SELECT id_log, origen, tablas_procesadas, tablas_ok,
            tablas_error, duracion_seg, ejecutado_por,
            DATE_FORMAT(fecha, '%Y-%m-%dT%H:%i:%s') AS fecha
     FROM maintenance_log
     ORDER BY fecha DESC
     LIMIT 50`
  );
  return rows;
};

export const getMaintenanceLogDetail = async (id) => {
  const [rows] = await poolOperacion.execute(
    `SELECT id_log, origen, tablas_procesadas, tablas_ok, tablas_error,
            duracion_seg, ejecutado_por, detalle_json, log_texto,
            DATE_FORMAT(fecha, '%Y-%m-%dT%H:%i:%s') AS fecha
     FROM maintenance_log WHERE id_log = ?`, [id]
  );
  return rows[0] ?? null;
};
