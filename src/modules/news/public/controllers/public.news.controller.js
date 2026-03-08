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
  }
};
