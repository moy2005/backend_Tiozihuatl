import * as Model from "../../models/periodos.model.js";


export const createPeriodoService    = (data)       => Model.createPeriodo(data);
export const updatePeriodoService    = (id, data)   => Model.updatePeriodo(id, data);
export const deletePeriodoService    = (id)         => Model.deletePeriodo(id);
export const listPeriodosService     = (filters)    => Model.getAllPeriodos(filters);
export const activarPeriodoService   = (id)         => Model.activarPeriodo(id);
export const checkRelacionesService  = (id)         => Model.checkPeriodoRelaciones(id);
