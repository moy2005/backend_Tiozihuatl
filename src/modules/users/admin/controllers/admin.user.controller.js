import { AdminUserService } from "../services/admin.user.service.js";
import { AuditService } from "../../../../core/services/audit.service.js";

// ================================================================
// 🧑‍💼 Controlador: Administración de Usuarios
// ================================================================
export const AdminUserController = {
  /**
   * ================================================================
   * GET /api/admin/usuarios
   * Listar todos los usuarios con sus roles y relaciones
   * ================================================================
   */
  async getAll(req, res) {
    try {
      const users = await AdminUserService.getAllUsers();
      res.status(200).json(users);
    } catch (err) {
      console.error("❌ Error al obtener usuarios:", err);
      res.status(500).json({ error: "Error interno al listar usuarios" });
    }
  },

  /**
   * ================================================================
   * POST /api/admin/usuarios
   * Crear un nuevo usuario desde el panel de administración
   * ================================================================
   */
  async create(req, res) {
    try {
      const result = await AdminUserService.createUser(req.body);

      // Auditoría del evento
      await AuditService.logEvent({
        id_usuario: req.user?.id || null,
        tipo_evento: "CREACION_USUARIO_ADMIN",
        descripcion: `El administrador #${req.user?.id || "N/A"} creó al usuario ${
          req.body.correo || req.body.matricula || "sin identificador"
        }`,
        ip_origen: req.ip,
      });

      res.status(201).json(result);
    } catch (err) {
      console.error("❌ Error al crear usuario:", err);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * ================================================================
   * PUT /api/admin/usuarios/:id
   * Actualizar datos completos de un usuario
   * ================================================================
   */
async update(req, res) {
  try {
    const id_usuario = req.params.id;
    const data = req.body;

    console.log("📥 [UPDATE] ID:", id_usuario);
    console.log("📦 [UPDATE] Body:", data);

    const result = await AdminUserService.updateUser(id_usuario, data);

    await AuditService.logEvent({
      id_usuario: req.user?.id || null,
      tipo_evento: "ACTUALIZACION_USUARIO",
      descripcion: `El administrador #${req.user?.id || "N/A"} actualizó al usuario #${id_usuario}`,
      ip_origen: req.ip,
    });

    console.log("✅ [UPDATE] Éxito:", result);
    return res.status(200).json(result);

  } catch (err) {
    console.error("❌ [UPDATE] Error completo:", err);
    return res.status(500).json({
      error: "Error interno al actualizar usuario",
      detalle: err.message || err,
    });
  }
},


  /**
   * ================================================================
   * DELETE /api/admin/usuarios/:id
   * Desactivar (eliminación lógica) un usuario
   * ================================================================
   */
  async delete(req, res) {
    try {
      const id_usuario = req.params.id;
      const result = await AdminUserService.deleteUser(id_usuario);

      // Auditoría del evento
      await AuditService.logEvent({
        id_usuario: req.user?.id || null,
        tipo_evento: "DESACTIVACION_USUARIO",
        descripcion: `El administrador #${req.user?.id || "N/A"} desactivó al usuario #${id_usuario}`,
        ip_origen: req.ip,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("❌ Error al desactivar usuario:", err);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * ================================================================
   * GET /api/admin/roles
   * Listar roles activos
   * ================================================================
   */
  async getRoles(req, res) {
    try {
      const roles = await AdminUserService.getRoles();
      res.status(200).json(roles);
    } catch (err) {
      console.error("❌ Error al obtener roles:", err);
      res.status(500).json({ error: "Error interno al consultar roles" });
    }
  },
 /**
   * ================================================================
   * GET /api/admin/catalogos/carreras
   * ================================================================
   */
  async getCarreras(req, res) {
    try {
      const carreras = await AdminUserService.getCarreras();
      res.status(200).json(carreras);
    } catch (err) {
      console.error("❌ Error al obtener carreras:", err);
      res.status(500).json({ error: "Error interno al obtener carreras" });
    }
  },

  /**
   * ================================================================
   * GET /api/admin/catalogos/semestres
   * ================================================================
   */
  async getSemestres(req, res) {
    try {
      const semestres = await AdminUserService.getSemestres();
      res.status(200).json(semestres);
    } catch (err) {
      console.error("❌ Error al obtener semestres:", err);
      res.status(500).json({ error: "Error interno al obtener semestres" });
    }
  },

async importUsers(req, res) {
  try {
    const file = req.file;
    const { id_rol, id_carrera, id_semestre, grupo, id_periodo } = req.body;

    if (!file) {
      return res.status(400).json({ error: "Archivo Excel requerido." });
    }

    const result = await AdminUserService.importFromExcel({
      buffer: file.buffer,
      id_rol,
      id_carrera,
      id_semestre,
      grupo,
      id_periodo,
      adminId: req.user?.id || null,
      ip: req.ip,
    });

    // Si se insertaron usuarios, devolver también el Excel de tokens
    // El frontend puede decidir si descargarlo automáticamente
    if (result._tokens?.length > 0) {

      const baseUrl = process.env.FRONTEND_URL;
      //const baseUrl     = "http://localhost:4200";

      const excelBuffer = await AdminUserService.generateTokensExcel(
        result._tokens,
        baseUrl
      );

      // Guardar el buffer en base64 para que el frontend lo descargue
      return res.status(200).json({
        message          : result.message,
        insertados        : result.insertados,
        omitidos          : result.omitidos,
        detalle_omitidos  : result.detalle_omitidos,
        tokens_excel_b64  : excelBuffer.toString("base64"),
      });
    }

    res.status(200).json({
      message         : result.message,
      insertados       : result.insertados,
      omitidos         : result.omitidos,
      detalle_omitidos : result.detalle_omitidos,
    });

  } catch (err) {
    console.error("❌ Error al importar usuarios:", err);
    res.status(400).json({ error: err.message });
  }
},

async downloadTemplate(req, res) {
  const XLSX = await import("xlsx");

  const data = [
    {
      matricula : "IEST0001",
      a_paterno : "HERVERT",
      a_materno : "ESPINOZA",
      nombre    : "FATIMA AIDE",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", "attachment; filename=plantilla_importacion_usuarios.xlsx");
  res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
},

async avanzarSemestre(req, res) {
  try {
    const { id_periodo_origen, id_periodo_destino, estudiantes } = req.body;

    if (!id_periodo_origen || !id_periodo_destino) {
      return res.status(400).json({ error: "Debe enviar id_periodo_origen e id_periodo_destino." });
    }

    const result = await AdminUserService.avanzarSemestrePersonalizado(
      id_periodo_origen,
      id_periodo_destino,
      estudiantes || []
    );

    await AuditService.logEvent({
      id_usuario: req.user?.id || null,
      tipo_evento: "AVANCE_SEMESTRE_SELECTIVO",
      descripcion: `Avance procesado desde periodo ${id_periodo_origen} hacia ${id_periodo_destino}`,
      ip_origen: req.ip,
    });

    res.status(200).json(result);

  } catch (err) {
    console.error("❌ Error al avanzar semestre:", err);
    res.status(400).json({ error: err.message });
  }
},

async getPreviewAvance(req, res) {
  try {
    const { id_periodo } = req.query;

    if (!id_periodo) {
      return res.status(400).json({ error: "Debe enviar id_periodo." });
    }

    const estudiantes = await AdminUserService.getEstudiantesParaAvance(id_periodo);
    res.status(200).json(estudiantes);

  } catch (err) {
    console.error("❌ Error al obtener preview de avance:", err);
    res.status(500).json({ error: "Error interno al obtener estudiantes." });
  }
},

async getFiltered(req, res) {
  try {

    const filters = {
      rol: req.query.rol,
      id_carrera: req.query.id_carrera,
      id_semestre: req.query.id_semestre,
      grupo: req.query.grupo,
      id_periodo: req.query.id_periodo,
    };

    const users = await AdminUserService.getFilteredUsers(filters);

    res.status(200).json(users);

  } catch (err) {
    console.error("❌ Error en filtros avanzados:", err);
    res.status(500).json({ error: "Error interno al filtrar usuarios" });
  }
},

async getOpcionesPorPeriodo(req, res) {
  try {
    const { id_periodo } = req.query;
    if (!id_periodo) {
      return res.status(400).json({ error: "Debe enviar id_periodo." });
    }
    const opciones = await AdminUserService.getOpcionesPorPeriodo(id_periodo);
    res.status(200).json(opciones);
  } catch (err) {
    console.error("❌ Error al obtener opciones por periodo:", err);
    res.status(500).json({ error: "Error interno." });
  }
},
  
};
