import { runMaintenance, getMaintenanceStatus, getMaintenanceLogs, getMaintenanceLogDetail, detectarTablas} from '../services/maintenance.service.js';

export const runManual = async (req, res) => {
  try {
    const result = await runMaintenance('manual', req.user?.id_usuario ?? null);
    res.json({ message: 'Optimización completada exitosamente', ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error ejecutando optimización' });
  }
};

export const getStatus = async (req, res) => {
  try {
    res.json(await getMaintenanceStatus());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo estado' });
  }
};

export const getLogs = async (req, res) => {
  try {
    res.json(await getMaintenanceLogs());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo historial' });
  }
};

export const getLogDetail = async (req, res) => {
  try {
    const log = await getMaintenanceLogDetail(req.params.id);
    if (!log) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo detalle' });
  }
};

export const runCron = async (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  try {
    const result = await runMaintenance('automatico', null);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error' });
  }
};

export const getTablasDetectadas = async (req, res) => {
  try {
    const tablas = await detectarTablas();
    res.json({ tablas, total: tablas.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error detectando tablas' });
  }
};


// ── Limpieza manual desde el panel ───────────────────────────
export const limpiarLogs = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 90;

    if (dias < 30) {
      return res.status(400).json({ 
        message: 'El período mínimo de retención es 30 días.' 
      });
    }

    const eliminados = await limpiarLogsAntiguos(dias);
    res.json({ 
      message: `Limpieza completada. ${eliminados} registro(s) eliminado(s).`,
      eliminados,
      dias_retencion: dias
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al limpiar logs.' });
  }
};
