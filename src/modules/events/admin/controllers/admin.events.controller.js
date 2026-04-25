import { EventsService } from "../../services/events.service.js";
import { EventsModel } from "../../models/events.model.js";
import { EventoImagenModel } from "../../models/eventoImagen.model.js";
import { EventoImagenService } from "../../services/eventoImagen.service.js";

function agruparImagenesPorEvento(imagenes) {
  return imagenes.reduce((acc, imagen) => {
    if (!acc[imagen.id_evento]) {
      acc[imagen.id_evento] = [];
    }

    acc[imagen.id_evento].push(imagen);
    return acc;
  }, {});
}

export const AdminEventsController = {
  getAll: async (req, res) => {
    try {
      const eventos = await EventsModel.getAllAdmin(req.query);
      const imagenes = await EventoImagenModel.getByEventos(
        eventos.map((evento) => evento.id_evento)
      );
      const imagenesPorEvento = agruparImagenesPorEvento(imagenes);

      res.json(
        eventos.map((evento) => ({
          ...evento,
          imagenes: imagenesPorEvento[evento.id_evento] || [],
        }))
      );
    } catch (err) {
      console.error("Error al obtener eventos admin:", err);
      res.status(500).json({ message: "Error al obtener eventos" });
    }
  },

  create: async (req, res) => {
    try {
      const result = await EventsService.create(req);
      res.status(201).json(result);
    } catch (err) {
      console.error("Error al crear evento:", err);
      res.status(400).json({ message: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const result = await EventsService.update(req);
      res.json(result);
    } catch (err) {
      console.error("Error al actualizar evento:", err);
      res.status(400).json({ message: err.message });
    }
  },

  updateDestacado: async (req, res) => {
    try {
      const result = await EventsService.updateDestacado(
        req.params.id,
        req.body?.destacado
      );
      res.json(result);
    } catch (err) {
      console.error("Error al actualizar destacado:", err);
      res.status(err.message === "Evento no encontrado" ? 404 : 400).json({
        message: err.message,
      });
    }
  },

  delete: async (req, res) => {
    try {
      const result = await EventsService.delete(req.params.id);
      res.json(result);
    } catch (err) {
      console.error("Error al eliminar evento:", err);
      res.status(err.message === "Evento no encontrado" ? 404 : 400).json({
        message: err.message || "Error al eliminar",
      });
    }
  },

  reorderImagenes: async (req, res) => {
    try {
      await EventoImagenService.reorder(req.body);
      res.json({ message: "Orden de imagenes actualizado" });
    } catch (err) {
      console.error("Error al reordenar imagenes:", err);
      res.status(400).json({ message: err.message });
    }
  },

  deleteImagen: async (req, res) => {
    try {
      await EventoImagenService.eliminarImagen(req.params.id_imagen);
      res.json({ message: "Imagen eliminada" });
    } catch (err) {
      console.error("Error al eliminar imagen:", err);
      res.status(400).json({ message: err.message });
    }
  },
};
