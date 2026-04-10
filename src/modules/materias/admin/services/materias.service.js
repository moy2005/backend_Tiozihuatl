import * as Model from "../../models/materias.model.js";

export const createMateriaService    = (data)        => Model.createMateria(data);
export const updateMateriaService    = (id, data)    => Model.updateMateria(id, data);
export const deleteMateriaService    = (id)          => Model.deleteMateria(id);
export const listMateriasService     = (filters)     => Model.getAllMaterias(filters);
export const toggleMateriaService    = (id, activo)  => Model.toggleMateria(id, activo);
export const checkRelacionesService  = (id)          => Model.checkMateriaRelaciones(id);
