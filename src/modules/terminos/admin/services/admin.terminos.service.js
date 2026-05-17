import model from '../../models/terminos.model.js';

const listar       = ()           => model.getAll();
const obtener      = (id)         => model.getById(id);
const crear        = (data)       => model.create(data);
const actualizar   = (id, data)   => model.update(id, data);
const cambiarEstado = (id, activo) => model.cambiarEstado(id, activo);
const eliminar     = (id)         => model.remove(id);

export default { listar, obtener, crear, actualizar, cambiarEstado, eliminar };