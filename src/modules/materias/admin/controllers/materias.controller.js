import * as Service from "../services/materias.service.js";

export const getMaterias = async (req, res) => {
  try {
    const data = await Service.listMateriasService(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
};

export const createMateria = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: "Nombre requerido" });
    const id = await Service.createMateriaService({ nombre });
    res.status(201).json({ message: "Materia creada", id });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
};

export const updateMateria = async (req, res) => {
  try {
    await Service.updateMateriaService(req.params.id, req.body);
    res.json({ message: "Materia actualizada" });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
};

export const toggleMateria = async (req, res) => {
  try {
    const { activo } = req.body;
    await Service.toggleMateriaService(req.params.id, activo);
    res.json({ message: "Estado actualizado" });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
};


export const canDeleteMateria = async (req, res) => {
  try {
    const resultado = await Service.checkRelacionesService(req.params.id);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ message: "Error al verificar relaciones" });
  }
};

// DELETE con doble verificación en el backend
export const deleteMateria = async (req, res) => {
  try {
    const { puedeEliminar, relaciones } = await Service.checkRelacionesService(req.params.id);

    if (!puedeEliminar) {
      return res.status(409).json({
        message: "No se puede eliminar: la materia tiene registros relacionados.",
        relaciones
      });
    }

    await Service.deleteMateriaService(req.params.id);
    res.json({ message: "Materia eliminada" });
  } catch (error) {
    res.status(500).json({ message: "Error interno al eliminar" });
  }
};