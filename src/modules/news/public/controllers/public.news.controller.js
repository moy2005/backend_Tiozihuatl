import { NewsModel } from "../../models/news.model.js";

export const PublicNewsController = {

  getPublicNews: async (req, res) => {
    try {
      const noticias = await NewsModel.getPublic();
      res.status(200).json(noticias || []);
    } catch (error) {
      console.error("Error GET /api/news:", error);
      res.status(500).json({ message: "Error al obtener noticias" });
    }
  },

  getPublicNewsById: async (req, res) => {
    try {
      const noticia = await NewsModel.getPublicById(req.params.id);

      if (!noticia) {
        return res.status(404).json({ message: "Noticia no encontrada" });
      }

      res.status(200).json(noticia);
    } catch (error) {
      console.error("Error GET /api/news/:id:", error);
      res.status(500).json({ message: "Error al obtener la noticia" });
    }
  },
};
