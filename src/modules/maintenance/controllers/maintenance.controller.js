import {runMaintenance, getMaintenanceStatus, getMaintenanceLogs, getMaintenanceLogDetail} from '../services/maintenance.service.js';

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