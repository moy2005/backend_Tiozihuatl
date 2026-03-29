import { NewsModel } from "../../models/news.model.js";
import { uploadToCloudinary } from "../../../../core/utils/cloudinaryUpload.js";

const MAX_ANOS_FUTURO = 2;
const MODO_PUBLICACION_AHORA = "ahora";
const MODO_PUBLICACION_PROGRAMADA = "programada";

function obtenerFechaActualMexicoMysql() {
  const ahoraMexico = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return ahoraMexico.toISOString().slice(0, 19).replace("T", " ");
}

function normalizarModoPublicacion(modo_publicacion, fecha_publicacion) {
  if ([MODO_PUBLICACION_AHORA, MODO_PUBLICACION_PROGRAMADA].includes(modo_publicacion)) {
    return modo_publicacion;
  }

  return fecha_publicacion ? MODO_PUBLICACION_PROGRAMADA : MODO_PUBLICACION_AHORA;
}

function resolverPublicacion({ modo_publicacion, fecha_publicacion }) {
  const modo = normalizarModoPublicacion(modo_publicacion, fecha_publicacion);

  if (modo === MODO_PUBLICACION_AHORA) {
    return {
      modo_publicacion: modo,
      fecha_publicacion: obtenerFechaActualMexicoMysql(),
      estado: "Publicada",
    };
  }

  if (!fecha_publicacion) {
    return { error: "La fecha de publicación es requerida." };
  }

  return {
    modo_publicacion: modo,
    fecha_publicacion,
    estado: "Borrador",
  };
}

function validarFechas(fecha_publicacion, fecha_caducidad) {
  const ahora = new Date();
  const pub = new Date(fecha_publicacion);
  const cad = fecha_caducidad ? new Date(fecha_caducidad) : null;

  const tolerancia = 5 * 60 * 1000;
  if (pub < new Date(ahora.getTime() - tolerancia)) {
    return "La fecha de publicación no puede ser en el pasado.";
  }

  const maxFuturo = new Date(ahora);
  maxFuturo.setFullYear(maxFuturo.getFullYear() + MAX_ANOS_FUTURO);
  if (pub > maxFuturo) {
    return `La fecha de publicación no puede ser más de ${MAX_ANOS_FUTURO} años en el futuro.`;
  }

  if (cad) {
    if (cad <= pub) {
      return "La fecha de caducidad debe ser posterior a la fecha de publicación.";
    }

    if (cad > maxFuturo) {
      return `La fecha de caducidad no puede ser más de ${MAX_ANOS_FUTURO} años en el futuro.`;
    }
  }

  return null;
}

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
      const { titulo, contenido, fecha_caducidad } = req.body;

      if (!titulo?.trim()) {
        return res.status(400).json({ message: "El título es requerido." });
      }
      if (!contenido?.trim()) {
        return res.status(400).json({ message: "El contenido es requerido." });
      }
      if (!fecha_caducidad) {
        return res.status(400).json({ message: "La fecha de caducidad es requerida." });
      }

      const publicacionResuelta = resolverPublicacion(req.body);
      if (publicacionResuelta.error) {
        return res.status(400).json({ message: publicacionResuelta.error });
      }

      const errorFechas = validarFechas(
        publicacionResuelta.fecha_publicacion,
        fecha_caducidad
      );
      if (errorFechas) {
        return res.status(400).json({ message: errorFechas });
      }

      let imagen_url = null;
      let video_url = null;

      if (req.files?.imagen) {
        imagen_url = await uploadToCloudinary(req.files.imagen[0], "noticias/imagenes");
      }
      if (req.files?.video) {
        video_url = await uploadToCloudinary(req.files.video[0], "noticias/videos");
      }

      await NewsModel.create({
        ...req.body,
        fecha_publicacion: publicacionResuelta.fecha_publicacion,
        estado: publicacionResuelta.estado,
        imagen_url,
        video_url,
      });

      res.status(201).json({ message: "Noticia creada correctamente" });

    } catch (error) {
      console.error("Error POST /api/news/admin:", error);
      res.status(500).json({ message: "Error al crear noticia" });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { titulo, contenido, fecha_caducidad } = req.body;

      if (!titulo?.trim()) {
        return res.status(400).json({ message: "El título es requerido." });
      }
      if (!contenido?.trim()) {
        return res.status(400).json({ message: "El contenido es requerido." });
      }
      if (!fecha_caducidad) {
        return res.status(400).json({ message: "La fecha de caducidad es requerida." });
      }

      const noticiaExistente = await NewsModel.getById(id);
      if (!noticiaExistente) {
        return res.status(404).json({ message: "Noticia no encontrada." });
      }

      const publicacionResuelta = resolverPublicacion(req.body);
      if (publicacionResuelta.error) {
        return res.status(400).json({ message: publicacionResuelta.error });
      }

      const errorFechas = validarFechas(
        publicacionResuelta.fecha_publicacion,
        fecha_caducidad
      );
      if (errorFechas) {
        return res.status(400).json({ message: errorFechas });
      }

      let imagen_url;
      if (req.files?.imagen) {
        imagen_url = await uploadToCloudinary(req.files.imagen[0], "noticias/imagenes");
      } else if ("imagen_url" in req.body) {
        imagen_url = req.body.imagen_url || null;
      } else {
        imagen_url = noticiaExistente.imagen_url;
      }

      let video_url;
      if (req.files?.video) {
        video_url = await uploadToCloudinary(req.files.video[0], "noticias/videos");
      } else if ("video_url" in req.body) {
        video_url = req.body.video_url || null;
      } else {
        video_url = noticiaExistente.video_url;
      }

      await NewsModel.update(id, {
        titulo,
        contenido,
        imagen_url,
        video_url,
        categoria: req.body.categoria,
        fecha_publicacion: publicacionResuelta.fecha_publicacion,
        fecha_caducidad,
        estado: publicacionResuelta.estado,
      });

      res.json({ message: "Noticia actualizada correctamente" });

    } catch (error) {
      console.error("Error PUT /api/news/admin:", error);
      res.status(500).json({ message: "Error al actualizar noticia" });
    }
  },

  delete: async (req, res) => {
    try {
      const noticiaExistente = await NewsModel.getById(req.params.id);
      if (!noticiaExistente) {
        return res.status(404).json({ message: "Noticia no encontrada." });
      }

      await NewsModel.delete(req.params.id);
      res.json({ message: "Noticia eliminada correctamente" });
    } catch (error) {
      console.error("Error DELETE /api/news/admin:", error);
      res.status(500).json({ message: "Error al eliminar noticia" });
    }
  }
};
