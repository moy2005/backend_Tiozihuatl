import { AdminUserService } from "../services/admin.user.service.js";
import { AuditService } from "../../../../core/services/audit.service.js";

export const AdminUserController = {
  async getAll(req, res) {
    try {
      const users = await AdminUserService.getAllUsers();
      res.status(200).json(users);
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
      res.status(500).json({ error: "Error interno al listar usuarios" });
    }
  },

  async create(req, res) {
    try {
      const result = await AdminUserService.createUser(req.body);

      await AuditService.logEvent({
        id_usuario: req.user?.id || null,
        tipo_evento: "CREACION_USUARIO_ADMIN",
        descripcion: `El administrador #${req.user?.id || "N/A"} creó al usuario ${
          req.body.correo || req.body.matricula || "sin identificador"
        }`,
        ip_origen: req.ip,
      });

      if (result._tokens?.length > 0) {
        const baseUrl = process.env.FRONTEND_URL;
        const excelBuffer = await AdminUserService.generateTokensExcel(
          result._tokens,
          baseUrl
        );

        return res.status(201).json({
          message: result.message,
          tokens_excel_b64: excelBuffer.toString("base64"),
        });
      }

      res.status(201).json(result);
    } catch (err) {
      console.error("Error al crear usuario:", err);
      res.status(400).json({ error: err.message });
    }
  },

  async update(req, res) {
    try {
      const id_usuario = req.params.id;
      const result = await AdminUserService.updateUser(id_usuario, req.body);

      await AuditService.logEvent({
        id_usuario: req.user?.id || null,
        tipo_evento: "ACTUALIZACION_USUARIO",
        descripcion: `El administrador #${req.user?.id || "N/A"} actualizÃ³ al usuario #${id_usuario}`,
        ip_origen: req.ip,
      });

      return res.status(200).json(result);
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      return res.status(400).json({ error: err.message || "No se pudo actualizar el usuario." });
    }
  },

  async delete(req, res) {
    try {
      const id_usuario = req.params.id;
      const result = await AdminUserService.deleteUser(id_usuario);

      await AuditService.logEvent({
        id_usuario: req.user?.id || null,
        tipo_evento: "DESACTIVACION_USUARIO",
        descripcion: `El administrador #${req.user?.id || "N/A"} desactivÃ³ al usuario #${id_usuario}`,
        ip_origen: req.ip,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("Error al desactivar usuario:", err);
      res.status(400).json({ error: err.message });
    }
  },

  async getRoles(req, res) {
    try {
      const roles = await AdminUserService.getRoles();
      res.status(200).json(roles);
    } catch (err) {
      console.error("Error al obtener roles:", err);
      res.status(500).json({ error: "Error interno al consultar roles" });
    }
  },

  async getCarreras(req, res) {
    try {
      const carreras = await AdminUserService.getCarreras();
      res.status(200).json(carreras);
    } catch (err) {
      console.error("Error al obtener carreras:", err);
      res.status(500).json({ error: "Error interno al obtener carreras" });
    }
  },

  async getSemestres(req, res) {
    try {
      const semestres = await AdminUserService.getSemestres();
      res.status(200).json(semestres);
    } catch (err) {
      console.error("Error al obtener semestres:", err);
      res.status(500).json({ error: "Error interno al obtener semestres" });
    }
  },

  async importUsers(req, res) {
    try {
      const file = req.file;
      const { id_rol, id_carrera, id_semestre, grupo, id_periodo, omit_existing } = req.body;

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
        omit_existing:
          omit_existing === true ||
          omit_existing === "true" ||
          omit_existing === 1 ||
          omit_existing === "1",
        adminId: req.user?.id || null,
        ip: req.ip,
      });

      if (result._tokens?.length > 0) {
        const baseUrl = process.env.FRONTEND_URL;
        const excelBuffer = await AdminUserService.generateTokensExcel(
          result._tokens,
          baseUrl
        );

        return res.status(200).json({
          message: result.message,
          insertados: result.insertados,
          omitidos: result.omitidos,
          existentes_omitidos: result.existentes_omitidos,
          detalle_omitidos: result.detalle_omitidos,
          tokens_excel_b64: excelBuffer.toString("base64"),
        });
      }

      res.status(200).json({
        message: result.message,
        insertados: result.insertados,
        omitidos: result.omitidos,
        existentes_omitidos: result.existentes_omitidos,
        detalle_omitidos: result.detalle_omitidos,
      });
    } catch (err) {
      console.error("Error al importar usuarios:", err);
      res.status(400).json({ error: err.message });
    }
  },

  async previewImportUsers(req, res) {
    try {
      const file = req.file;
      const { id_rol } = req.body;

      if (!file) {
        return res.status(400).json({ error: "Archivo Excel requerido." });
      }

      const result = await AdminUserService.previewImportFromExcel({
        buffer: file.buffer,
        id_rol,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("Error al validar importacion:", err);
      res.status(400).json({ error: err.message || "No se pudo validar el archivo." });
    }
  },

  async downloadTemplate(req, res) {
    try {
      const XLSX = await import("xlsx");
      const { id_rol } = req.query;

      if (!id_rol) {
        return res
          .status(400)
          .json({ error: "Debe seleccionar un rol para descargar la plantilla." });
      }

      const roles = await AdminUserService.getRoles();
      const rol = roles.find((item) => Number(item.id_rol) === Number(id_rol));

      if (!rol) {
        return res.status(400).json({ error: "Rol invÃ¡lido." });
      }

      const esEstudiante = rol.nombre_rol === "Estudiante";
      const data = esEstudiante
        ? [
            {
              matricula: "IEST0001",
              a_paterno: "HERVERT",
              a_materno: "ESPINOZA",
              nombre: "FATIMA AIDE",
            },
          ]
        : [
            {
              correo: "usuario@institucion.edu.mx",
              a_paterno: "HERVERT",
              a_materno: "ESPINOZA",
              nombre: "FATIMA AIDE",
            },
          ];

      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const fileName = esEstudiante
        ? "plantilla_importacion_estudiantes.xlsx"
        : `plantilla_importacion_${rol.nombre_rol.toLowerCase()}.xlsx`;

      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (err) {
      console.error("Error al descargar plantilla:", err);
      res.status(400).json({ error: err.message || "No se pudo generar la plantilla." });
    }
  },

  async avanzarSemestre(req, res) {
    try {
      const { id_periodo_origen, id_periodo_destino, estudiantes } = req.body;

      if (!id_periodo_origen || !id_periodo_destino) {
        return res
          .status(400)
          .json({ error: "Debe enviar id_periodo_origen e id_periodo_destino." });
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
      console.error("Error al avanzar semestre:", err);
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
      console.error("Error al obtener preview de avance:", err);
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
      console.error("Error en filtros avanzados:", err);
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
      console.error("Error al obtener opciones por periodo:", err);
      res.status(500).json({ error: "Error interno." });
    }
  },
};
