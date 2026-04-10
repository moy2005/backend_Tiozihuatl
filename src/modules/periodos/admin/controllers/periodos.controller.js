import * as Service from "../services/periodos.service.js";

export const getPeriodos = async (req, res) => {
  try {
    const data = await Service.listPeriodosService(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
};

export const createPeriodo = async (req, res) => {
  try {
    const { nombre, fecha_inicio, fecha_fin } = req.body;
    if (!nombre || !fecha_inicio || !fecha_fin)
      return res.status(400).json({ message: "Datos incompletos" });

    const id = await Service.createPeriodoService({ nombre, fecha_inicio, fecha_fin });
    res.status(201).json({ message: "Periodo creado", id });
  } catch (error) {
    if (error.message.includes("traslapa"))
      return res.status(409).json({ message: error.message });
    res.status(500).json({ message: "Error interno" });
  }
};

export const updatePeriodo = async (req, res) => {
  try {
    await Service.updatePeriodoService(req.params.id, req.body);
    res.json({ message: "Periodo actualizado" });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
};

export const activarPeriodo = async (req, res) => {
  try {
    await Service.activarPeriodoService(req.params.id);
    res.json({ message: "Periodo activado" });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
};

export const canDeletePeriodo = async (req, res) => {
  try {
    const resultado = await Service.checkRelacionesService(req.params.id);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ message: "Error al verificar relaciones" });
  }
};

export const deletePeriodo = async (req, res) => {
  try {
    const { puedeEliminar, relaciones } = await Service.checkRelacionesService(req.params.id);

    if (!puedeEliminar) {
      return res.status(409).json({
        message: "No se puede eliminar: el periodo tiene registros relacionados.",
        relaciones
      });
    }

    await Service.deletePeriodoService(req.params.id);
    res.json({ message: "Periodo eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error interno al eliminar" });
  }
};