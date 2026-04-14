import { poolOperacion } from "../../../../config/dbPools/poolOperacion.config.js";
import { MaterialModel } from "../../models/material.model.js";
import cloudinary from "../../../../config/cloudinary.config.js";

export const DocenteMaterialService = {

  async createMaterial(data, file, user) {
    const conn = await poolOperacion.getConnection();
    try {
      await conn.beginTransaction();

      if (!file) throw new Error("Archivo no proporcionado");

      let tipo = "OTRO";
      const mime = file.mimetype.toLowerCase();

      if (mime === "application/pdf") {
        tipo = "PDF";
      } else if (mime === "application/msword" || mime.includes("officedocument.wordprocessingml")) {
        tipo = "WORD";
      } else if (mime === "application/vnd.ms-excel" || mime.includes("officedocument.spreadsheetml")) {
        tipo = "EXCEL";
      } else if (mime === "application/vnd.ms-powerpoint" || mime.includes("officedocument.presentationml")) {
        tipo = "PPT";
      } else if (mime.startsWith("image/")) {
        tipo = "IMAGEN";
      } else if (mime.startsWith("video/")) {
        tipo = "VIDEO";
      } else if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) {
        tipo = "ZIP";
      }

    const nombreLimpio = file.originalname
        .replace(/\.[^/.]+$/, '')       
        .replace(/[^a-zA-Z0-9_-]/g, '_') 
        .substring(0, 80);             

    const upload = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { 
            folder: `materiales/${tipo.toLowerCase()}`, 
            resource_type: "auto",
            public_id: nombreLimpio       
            },
            (error, result) => { if (error) reject(error); else resolve(result); }
        ).end(file.buffer);
        });

      const id_material = await MaterialModel.create({
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipo,
        public_id: upload.public_id,
        url: upload.secure_url,
        id_usuario: user.id_usuario,
        visibilidad: data.visibilidad
      }, conn);

      await MaterialModel.insertMaterias(id_material, JSON.parse(data.materias || "[]"), conn);
      await MaterialModel.insertSemestres(id_material, JSON.parse(data.semestres || "[]"), conn);

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
    if (material.id_usuario !== user.id_usuario) throw new Error("No autorizado");

    const conn = await poolOperacion.getConnection();
    try {
      await conn.beginTransaction();

      let resource_type = "raw";
      if (material.tipo === "IMAGEN") resource_type = "image";
      else if (material.tipo === "VIDEO") resource_type = "video";

      try {
        await cloudinary.uploader.destroy(material.public_id, { resource_type });
      } catch (cloudError) {
        console.error("Error eliminando en Cloudinary:", cloudError);
        throw new Error("Error eliminando archivo en la nube");
      }

      await conn.query(`DELETE FROM material_materia WHERE id_material = ?`, [id_material]);
      await conn.query(`DELETE FROM material_semestre WHERE id_material = ?`, [id_material]);
      await conn.query(`DELETE FROM materiales WHERE id_material = ?`, [id_material]);

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
  const id = parseInt(id_material);
  const archivoNuevo = file || null;
  const conn = await poolOperacion.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT * FROM materiales WHERE id_material = ?`, [id]
    );
    const material = rows[0];

    console.log('🔍 material:', material?.titulo, '| owner:', material?.id_usuario, '| user:', user.id_usuario);

    if (!material) throw new Error("Material no encontrado");
    if (material.id_usuario !== user.id_usuario) throw new Error("No autorizado");

    let tipo = material.tipo;
    let public_id = material.public_id;
    let url = material.url;

    if (archivoNuevo) {
      const mime = archivoNuevo.mimetype.toLowerCase();
      tipo = "OTRO";

      if (mime === "application/pdf") tipo = "PDF";
      else if (mime === "application/msword" || mime.includes("officedocument.wordprocessingml")) tipo = "WORD";
      else if (mime === "application/vnd.ms-excel" || mime.includes("officedocument.spreadsheetml")) tipo = "EXCEL";
      else if (mime === "application/vnd.ms-powerpoint" || mime.includes("officedocument.presentationml")) tipo = "PPT";
      else if (mime.startsWith("image/")) tipo = "IMAGEN";
      else if (mime.startsWith("video/")) tipo = "VIDEO";
      else if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) tipo = "ZIP";

      await cloudinary.uploader.destroy(material.public_id, {
        resource_type: material.tipo === "IMAGEN" ? "image" : material.tipo === "VIDEO" ? "video" : "raw"
      });

        const nombreLimpio = archivoNuevo.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 80);

        const upload = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { 
            folder: `materiales/${tipo.toLowerCase()}`, 
            resource_type: "auto",
            public_id: nombreLimpio     
            },
            (error, result) => { if (error) reject(error); else resolve(result); }
        ).end(archivoNuevo.buffer);
        });

      public_id = upload.public_id;
      url = upload.secure_url;
    }

    await conn.query(
      `UPDATE materiales 
       SET titulo = ?, descripcion = ?, visibilidad = ?, tipo = ?, public_id = ?, url = ?
       WHERE id_material = ?`,
      [data.titulo, data.descripcion, data.visibilidad, tipo, public_id, url, id]
    );

    await conn.query(`DELETE FROM material_materia WHERE id_material = ?`, [id]);
    await conn.query(`DELETE FROM material_semestre WHERE id_material = ?`, [id]);

    const materias = JSON.parse(data.materias || "[]");
    const semestres = JSON.parse(data.semestres || "[]");

    if (materias.length > 0) {
      const valoresMaterias = materias.map(id_materia => [id, id_materia]);
      await conn.query(`INSERT INTO material_materia (id_material, id_materia) VALUES ?`, [valoresMaterias]);
    }

    if (semestres.length > 0) {
      const valoresSemestres = semestres.map(id_semestre => [id, id_semestre]);
      await conn.query(`INSERT INTO material_semestre (id_material, id_semestre) VALUES ?`, [valoresSemestres]);
    }

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
    if (material.id_usuario !== user.id_usuario) throw new Error("No autorizado");
    await MaterialModel.updateStatus(id_material, activo);
  },

  async getMaterialById(id_material, user) {
    const material = await MaterialModel.findByIdWithRelations(id_material);
    if (!material) throw new Error("Material no encontrado");
    if (material.id_usuario !== user.id_usuario) throw new Error("No autorizado");
    return material;
  },

  async getMyMaterials(user, filters) {
    let baseWhere = `WHERE m.id_usuario = ?`;
    const baseParams = [user.id_usuario];

    if (filters.search?.trim()) {
        baseWhere += ` AND (m.titulo LIKE ? OR m.descripcion LIKE ?)`;
        baseParams.push(`%${filters.search.trim()}%`, `%${filters.search.trim()}%`);
    }
    if (filters.materia) {
        baseWhere += ` AND m.id_material IN (SELECT id_material FROM material_materia WHERE id_materia = ?)`;
        baseParams.push(filters.materia);
    }
    if (filters.semestre) {
        baseWhere += ` AND m.id_material IN (SELECT id_material FROM material_semestre WHERE id_semestre = ?)`;
        baseParams.push(filters.semestre);
    }
    if (filters.tipo) {
        baseWhere += ` AND m.tipo = ?`;
        baseParams.push(filters.tipo);
    }

    const [[{ total }]] = await poolOperacion.query(
        `SELECT COUNT(DISTINCT m.id_material) AS total FROM materiales m ${baseWhere}`,
        baseParams
    );

    const limit  = parseInt(filters.limit) || 6;
    const page   = parseInt(filters.page)  || 1;
    const offset = (page - 1) * limit;

    const query = `
        SELECT 
        m.*,
        GROUP_CONCAT(DISTINCT mat.nombre) AS materias,
        GROUP_CONCAT(DISTINCT s.nombre_semestre) AS semestres
        FROM materiales m
        LEFT JOIN material_materia mm  ON m.id_material = mm.id_material
        LEFT JOIN materias mat          ON mm.id_materia = mat.id
        LEFT JOIN material_semestre ms ON m.id_material = ms.id_material
        LEFT JOIN semestres s           ON ms.id_semestre = s.id_semestre
        ${baseWhere}
        GROUP BY m.id_material
        ORDER BY m.id_material DESC
        LIMIT ? OFFSET ?
    `;

    const [rows] = await poolOperacion.query(query, [...baseParams, limit, offset]);

    return { data: rows, total };  
    },
};