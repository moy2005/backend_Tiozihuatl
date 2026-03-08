import { NewsModel } from "../../models/news.model.js";
import { uploadToCloudinary } from "../../../../core/utils/cloudinaryUpload.js";

export const AdminNewsController = {

  getAll: async (req, res) => {
    try {
      const rows = await NewsModel.getAllAdmin();
      res.json(rows);
    } catch (error) {
      console.error("Error GET /api/news/admin:", error);
      res.status(500).json({ message: "Error al obtener noticias" });
    }
  },

  create: async (req, res) => {
    try {
      let imagen_url = null;
      let video_url = null;

      // Imagen
      if (req.files?.imagen) {
        imagen_url = await uploadToCloudinary(
          req.files.imagen[0],
          "noticias/imagenes"
        );
      }

      // Video
      if (req.files?.video) {
        video_url = await uploadToCloudinary(
          req.files.video[0],
          "noticias/videos"
        );
      }

      await NewsModel.create({
        ...req.body,
        imagen_url,
        video_url
      });

      res.status(201).json({
        message: "Noticia creada correctamente"
      });

    } catch (error) {
      console.error("Error POST /api/news/admin:", error);
      res.status(500).json({
        message: "Error al crear noticia"
      });
    }
  },

  update: async (req, res) => {
    try {
      let imagen_url = req.body.imagen_url || null;
      let video_url = req.body.video_url || null;

      if (req.files?.imagen) {
        imagen_url = await uploadToCloudinary(
          req.files.imagen[0],
          "noticias/imagenes"
        );
      }

      if (req.files?.video) {
        video_url = await uploadToCloudinary(
          req.files.video[0],
          "noticias/videos"
        );
      }

      await NewsModel.update(req.params.id, {
        ...req.body,
        imagen_url,
        video_url
      });

      res.json({
        message: "Noticia actualizada correctamente"
      });

    } catch (error) {
      console.error("Error PUT /api/news/admin:", error);
      res.status(500).json({
        message: "Error al actualizar noticia"
      });
    }
  },

  delete: async (req, res) => {
    try {
      await NewsModel.delete(req.params.id);
      res.json({ message: "Noticia eliminada correctamente" });
    } catch (error) {
      console.error("Error DELETE /api/news/admin:", error);
      res.status(500).json({ message: "Error al eliminar noticia" });
    }
  }
};
