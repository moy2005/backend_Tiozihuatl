import { EventsModel } from "../../models/events.model.js";
import { EventoImagenModel } from "../../models/eventoImagen.model.js";

function agruparImagenesPorEvento(imagenes) {
  return imagenes.reduce((acc, imagen) => {
    if (!acc[imagen.id_evento]) {
      acc[imagen.id_evento] = [];
    }

    acc[imagen.id_evento].push(imagen);
    return acc;
  }, {});
}

export const EventsController = {
  getAll: async (req, res) => {
    try {
      const eventos = await EventsModel.getPublic(req.query);
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
    } catch (error) {
      console.error("Error al obtener eventos publicos:", error);
      res.status(500).json({ message: "Error al obtener eventos" });
    }
  },

  getById: async (req, res) => {
    try {
      const evento = await EventsModel.getPublicById(req.params.id);

      if (!evento) {
        return res.status(404).json({ message: "Evento no encontrado" });
      }

      const imagenes = await EventoImagenModel.getByEvento(evento.id_evento);

      res.json({
        ...evento,
        imagenes,
      });
    } catch (error) {
      console.error("Error al obtener detalle del evento publico:", error);
      res.status(500).json({ message: "Error al obtener el evento" });
    }
  },
};
