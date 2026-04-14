import { poolOperacion } from "../../../../config/dbPools/poolOperacion.config.js";
import { MaterialModel } from "../../models/material.model.js";
import cloudinary from "../../../../config/cloudinary.config.js";

export const AdminMaterialService = {

  async createMaterial(data, file, user) {

    const conn = await poolOperacion.getConnection();

    try {
      await conn.beginTransaction();

      //  VALIDACIÓN
      if (!file) {
        throw new Error("Archivo no proporcionado");
      }

      // 🔍 DEBUG — quítalo después de confirmar
      console.log("=== DEBUG UPLOAD ===");
      console.log("mimetype:", file.mimetype);
      console.log("originalname:", file.originalname);
      console.log("====================");

      //  1. Tipo de archivo (detección robusta)
      let tipo = "OTRO";
      const mime = file.mimetype.toLowerCase();
      //  PDF
      if (mime === "application/pdf") {
        tipo = "PDF";
      //  WORD (doc, docx)
      } else if (
        mime === "application/msword" ||
        mime.includes("officedocument.wordprocessingml")
      ) {
        tipo = "WORD";
      // EXCEL (xls, xlsx)
      } else if (
        mime === "application/vnd.ms-excel" ||
        mime.includes("officedocument.spreadsheetml")
      ) {
        tipo = "EXCEL";
      // POWERPOINT (ppt, pptx)
      } else if (
        mime === "application/vnd.ms-powerpoint" ||
        mime.includes("officedocument.presentationml")
      ) {
        tipo = "PPT";
      // IMÁGENES (png, jpg, jpeg, webp, etc)
      } else if (mime.startsWith("image/")) {
        tipo = "IMAGEN";
      //  VIDEO (mp4, webm, mov, etc)
      } else if (mime.startsWith("video/")) {
        tipo = "VIDEO";
      //  ARCHIVOS COMPRIMIDOS (opcional futuro)
      } else if (
        mime.includes("zip") ||
        mime.includes("rar") ||
        mime.includes("7z")
      ) {
        tipo = "ZIP";
      }


      // RESOURCE TYPE
      let resource_type = "raw";
      if (tipo === "IMAGEN") resource_type = "image";
      if (tipo === "VIDEO") resource_type = "video";
      if (tipo === "PDF") resource_type = "image";

      // AGREGAR FORMATOS
      const formatos = {
        'WORD':  'docx',
        'EXCEL': 'xlsx',
        'PPT':   'pptx',
        'PDF':   'pdf'
      };
      const format = formatos[tipo] || undefined;

      //  NOMBRE LIMPIO
      const nombreOriginal = file.originalname;
      const nombreSinExt = nombreOriginal.replace(/\.[^/.]+$/, "");

      const nombreLimpio = nombreSinExt
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\w\-]/g, "");
      
      //  2. Upload Cloudinary
      const upload = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `materiales/${tipo.toLowerCase()}`,
             resource_type,
             public_id: nombreLimpio,
             use_filename: true,
             unique_filename: false,
             format
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });


      //  3. Crear material
      const id_material = await MaterialModel.create({
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipo,
        public_id: upload.public_id,
        url: upload.secure_url,
        id_usuario: user.id_usuario,
        visibilidad: data.visibilidad
      }, conn);

      //  4. Insertar relaciones
      await MaterialModel.insertMaterias(
        id_material,
        JSON.parse(data.materias || "[]"),
        conn
      );

      await MaterialModel.insertSemestres(
        id_material,
        JSON.parse(data.semestres || "[]"),
        conn
      );

      await conn.commit();

      return id_material;

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },


  async deleteMaterial(id_material, user) {

    const material = await MaterialModel.findById(id_material);

    if (!material) throw new Error("Material no encontrado");

    if (material.id_usuario !== user.id_usuario && user.rol !== "Administrador") {
      throw new Error("No autorizado");
    }

    const conn = await poolOperacion.getConnection();

    try {
      await conn.beginTransaction();

      // 🔥 1. detectar resource_type
      let resource_type = "raw";

      if (material.tipo === "IMAGEN") {
        resource_type = "image";
      } else if (material.tipo === "VIDEO") {
        resource_type = "video";
      }
      if (material.tipo === "PDF") 
        resource_type = "image";

      // 🔥 2. eliminar archivo en Cloudinary (PRIMERO)
      try {
        await cloudinary.uploader.destroy(material.public_id, {
          resource_type:
              material.tipo === "IMAGEN" || material.tipo === "PDF"
            ? "image"
            : material.tipo === "VIDEO"
            ? "video"
            : "raw"
        });
      } catch (cloudError) {
        console.error("Error eliminando en Cloudinary:", cloudError);
        throw new Error("Error eliminando archivo en la nube");
      }

      // 🔥 3. eliminar relaciones
      await conn.query(
        `DELETE FROM material_materia WHERE id_material = ?`,
        [id_material]
      );

      await conn.query(
        `DELETE FROM material_semestre WHERE id_material = ?`,
        [id_material]
      );

      // 🔥 4. eliminar material
      await conn.query(
        `DELETE FROM materiales WHERE id_material = ?`,
        [id_material]
      );

      await conn.commit();

      return { ok: true };

    } catch (error) {
      await conn.rollback();
      throw error;

    } finally {
      conn.release();
    }
  },

  async updateMaterial(id_material, data, file, user) {

    const conn = await poolOperacion.getConnection();

    try {
      await conn.beginTransaction();

      //  1. Obtener material actual
      const material = await MaterialModel.findById(id_material);

      if (!material) throw new Error("Material no encontrado");

      //  2. Validar propietario
      if (material.id_usuario !== user.id_usuario && user.rol !== "Administrador") {
        throw new Error("No autorizado");
      }

      //  3. Valores actuales
      let tipo = material.tipo;
      let public_id = material.public_id;
      let url = material.url;

      //  4. Si hay archivo nuevo → reemplazar
      if (file) {

        const mime = file.mimetype.toLowerCase();

        tipo = "OTRO";

        if (mime === "application/pdf") {
          tipo = "PDF";

        } else if (
          mime === "application/msword" ||
          mime.includes("officedocument.wordprocessingml")
        ) {
          tipo = "WORD";

        } else if (
          mime === "application/vnd.ms-excel" ||
          mime.includes("officedocument.spreadsheetml")
        ) {
          tipo = "EXCEL";

        } else if (
          mime === "application/vnd.ms-powerpoint" ||
          mime.includes("officedocument.presentationml")
        ) {
          tipo = "PPT";

        } else if (mime.startsWith("image/")) {
          tipo = "IMAGEN";

        } else if (mime.startsWith("video/")) {
          tipo = "VIDEO";

        } else if (
          mime.includes("zip") ||
          mime.includes("rar") ||
          mime.includes("7z")
        ) {
          tipo = "ZIP";
        }

        //  eliminar archivo anterior
        await cloudinary.uploader.destroy(material.public_id, {
          resource_type:
            material.tipo === "IMAGEN"
              ? "image"
              : material.tipo === "VIDEO"
              ? "video"
              : "raw"
        });

          let resource_type = "raw";
          if (tipo === "IMAGEN") resource_type = "image";
          if (tipo === "VIDEO") resource_type = "video";
          if (tipo === "PDF") resource_type = "image";

          // ✅ AGREGAR FORMATOS
          const formatos = {
            'WORD':  'docx',
            'EXCEL': 'xlsx',
            'PPT':   'pptx',
            'PDF':   'pdf'
          };
          const format = formatos[tipo] || undefined;

          const nombreOriginal = file.originalname;
          const nombreSinExt = nombreOriginal.replace(/\.[^/.]+$/, "");

          const nombreLimpio = nombreSinExt
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^\w\-]/g, "");

        //  subir nuevo
        const upload = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: `materiales/${tipo.toLowerCase()}`,
              resource_type,
              public_id: nombreLimpio,
              use_filename: true,
              unique_filename: false,
              format
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file.buffer);
        });

        
      }

      //  5. Actualizar material
      await MaterialModel.update(id_material, {
        titulo: data.titulo,
        descripcion: data.descripcion,
        visibilidad: data.visibilidad,
        tipo,
        public_id,
        url
      }, conn);

      //  6. Actualizar relaciones (IMPORTANTE)
      await MaterialModel.clearMaterias(id_material, conn);
      await MaterialModel.clearSemestres(id_material, conn);

      await MaterialModel.insertMaterias(
        id_material,
        JSON.parse(data.materias || "[]"),
        conn
      );

      await MaterialModel.insertSemestres(
        id_material,
        JSON.parse(data.semestres || "[]"),
        conn
      );

      await conn.commit();

      return true;

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async changeStatus(id_material, activo, user) {

    const material = await MaterialModel.findById(id_material);

    if (!material) throw new Error("Material no encontrado");

    if (material.id_usuario !== user.id_usuario && user.rol !== "Administrador") {
      throw new Error("No autorizado");
    }

    await MaterialModel.updateStatus(id_material, activo);
  },

  async getMaterialById(id_material, user) {

    const material = await MaterialModel.findByIdWithRelations(id_material);

    if (!material) throw new Error("Material no encontrado");

    if (material.id_usuario !== user.id_usuario && user.rol !== "Administrador") {
      throw new Error("No autorizado");
    }

    return material;
  },

  async getMyMaterials(user, filters) {

    let query = `
      SELECT 
        m.*,
        GROUP_CONCAT(DISTINCT mat.nombre) AS materias,
        GROUP_CONCAT(DISTINCT s.nombre_semestre) AS semestres

      FROM materiales m

      LEFT JOIN material_materia mm 
        ON m.id_material = mm.id_material

      LEFT JOIN materias mat 
        ON mm.id_materia = mat.id

      LEFT JOIN material_semestre ms 
        ON m.id_material = ms.id_material

      LEFT JOIN semestres s 
        ON ms.id_semestre = s.id_semestre

      WHERE m.id_usuario = ?
    `;

    const params = [user.id_usuario];

    // 🔍 BUSCADOR
    if (filters.search && filters.search.trim().length > 0) {
      query += ` AND (
        m.titulo LIKE ?
        OR m.descripcion LIKE ?
      )`;

      params.push(
        `%${filters.search.trim()}%`,
        `%${filters.search.trim()}%`
      );
    }

    // 📚 MATERIA
    if (filters.materia) {
      query += ` AND m.id_material IN (
        SELECT id_material 
        FROM material_materia 
        WHERE id_materia = ?
      )`;
      params.push(filters.materia);
    }

    // 🎓 SEMESTRE
    if (filters.semestre) {
      query += ` AND m.id_material IN (
        SELECT id_material 
        FROM material_semestre 
        WHERE id_semestre = ?
      )`;
      params.push(filters.semestre);
    }

    // 🧩 TIPO
    if (filters.tipo) {
      query += ` AND m.tipo = ?`;
      params.push(filters.tipo);
    }

    query += ` GROUP BY m.id_material`;

    // 📄 PAGINACIÓN
    const limit = parseInt(filters.limit) || 6;
    const page = parseInt(filters.page) || 1;
    const offset = (page - 1) * limit;

    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await poolOperacion.query(query, params);

    return rows;
  },



  async getAllMaterials(filters) {
  let query = `
    SELECT 
      m.*,
      u.nombre AS nombre_docente,
      GROUP_CONCAT(DISTINCT mat.nombre) AS materias,
      GROUP_CONCAT(DISTINCT s.nombre_semestre) AS semestres
    FROM materiales m
    LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
    LEFT JOIN material_materia mm ON m.id_material = mm.id_material
    LEFT JOIN materias mat ON mm.id_materia = mat.id
    LEFT JOIN material_semestre ms ON m.id_material = ms.id_material
    LEFT JOIN semestres s ON ms.id_semestre = s.id_semestre
    WHERE 1=1
  `;

  const params = [];

  if (filters.search?.trim().length > 0) {
    query += ` AND (m.titulo LIKE ? OR m.descripcion LIKE ?)`;
    params.push(`%${filters.search.trim()}%`, `%${filters.search.trim()}%`);
  }

  if (filters.materia) {
    query += ` AND m.id_material IN (SELECT id_material FROM material_materia WHERE id_materia = ?)`;
    params.push(filters.materia);
  }

  if (filters.semestre) {
    query += ` AND m.id_material IN (SELECT id_material FROM material_semestre WHERE id_semestre = ?)`;
    params.push(filters.semestre);
  }

  if (filters.tipo) {
    query += ` AND m.tipo = ?`;
    params.push(filters.tipo);
  }

  query += ` GROUP BY m.id_material ORDER BY m.fecha_creacion DESC`;

  const limit = parseInt(filters.limit) || 10;
  const page = parseInt(filters.page) || 1;
  const offset = (page - 1) * limit;

  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await poolOperacion.query(query, params);
  return rows;
}
};