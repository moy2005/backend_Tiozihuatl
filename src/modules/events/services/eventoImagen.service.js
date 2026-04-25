import { EventoImagenModel } from "../models/eventoImagen.model.js";
import { uploadToCloudinary } from "../../../core/utils/cloudinaryUpload.js";
import { deleteFromCloudinary } from "../../../core/utils/cloudinaryDelete.js";

const MAX_IMAGENES = 15;

async function subirImagenes(files = []) {
  const imagenesSubidas = [];

  for (const file of files) {
    const resultado = await uploadToCloudinary(file, "eventos", {
      returnMetadata: true,
    });
    imagenesSubidas.push(resultado);
  }

  return imagenesSubidas;
}

export const EventoImagenService = {
  agregarImagenes: async (id_evento, files) => {
    if (!files?.length) return [];

    const existentes = await EventoImagenModel.getByEvento(id_evento);

    if (existentes.length + files.length > MAX_IMAGENES) {
      throw new Error("Maximo 15 imagenes por evento");
    }

    const imagenesSubidas = await subirImagenes(files);
    return EventoImagenModel.create(id_evento, imagenesSubidas, existentes.length);
  },

  eliminarImagen: async (id_imagen) => {
    const imagen = await EventoImagenModel.getById(id_imagen);

    if (!imagen) {
      throw new Error("Imagen no encontrada");
    }

    await deleteFromCloudinary(imagen.public_id);
    await EventoImagenModel.delete(id_imagen);
    await EventoImagenModel.normalizeOrden(imagen.id_evento);
  },

  eliminarImagenesDeEvento: async (id_evento) => {
    const imagenes = await EventoImagenModel.getByEvento(id_evento);
    if (!imagenes.length) return;

    const resultados = await Promise.allSettled(
      imagenes.map((imagen) => deleteFromCloudinary(imagen.public_id))
    );

    const errores = resultados.filter((resultado) => resultado.status === "rejected");
    if (errores.length) {
      throw new Error("No se pudieron eliminar todas las imagenes del evento");
    }
  },

  reorder: async (payload) => {
    const imagenes = Array.isArray(payload) ? payload : payload?.imagenes;

    if (!Array.isArray(imagenes) || !imagenes.length) {
      throw new Error("Formato invalido para reordenar imagenes");
    }

    const normalizadas = imagenes.map((imagen, index) => ({
      id_imagen: Number(imagen.id_imagen),
      orden: Number(imagen.orden) || index + 1,
    }));

    if (normalizadas.some((imagen) => !imagen.id_imagen || imagen.orden <= 0)) {
      throw new Error("Cada imagen debe incluir id_imagen y orden validos");
    }

    await EventoImagenModel.updateOrden(normalizadas);
  },
};
