import politicaModel from '../../models/politica.model.js';

const listar        = (filters)     => politicaModel.getAllAdmin(filters);
const crear         = (data)        => politicaModel.create(data);
const actualizar    = (id, data)    => politicaModel.update(id, data);
const cambiarEstado = (id, activo)  => politicaModel.cambiarEstado(id, activo);
const eliminar      = (id)          => politicaModel.deleteById(id);

export default { listar, crear, actualizar, cambiarEstado, eliminar };