import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import XLSX from "xlsx";
import { poolPromise } from "../../../../config/db.config.js";
import { AdminUserModel } from "../models/user.model.js";
import { RoleModel } from "../models/role.model.js";

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isStudentRole = (roleName) => roleName === "Estudiante";

const buildFullName = ({ a_paterno, a_materno, nombre }) =>
  [a_paterno, a_materno, nombre].filter(Boolean).join(" ");

async function getRoleName(connection, id_rol) {
  const [rows] = await connection.query(
    "SELECT nombre_rol FROM roles WHERE id_rol = ?",
    [id_rol]
  );

  if (!rows.length) {
    throw new Error("El rol seleccionado no existe.");
  }

  return rows[0].nombre_rol;
}

async function ensureUniqueEmail(connection, correo, excludeUserId = null) {
  if (!correo) return;

  const query = excludeUserId
    ? "SELECT id_usuario FROM usuarios WHERE correo = ? AND id_usuario <> ? LIMIT 1"
    : "SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1";

  const params = excludeUserId ? [correo, excludeUserId] : [correo];
  const [rows] = await connection.query(query, params);

  if (rows.length > 0) {
    throw new Error("El correo ya estÃ¡ registrado.");
  }
}

async function ensureUniqueMatricula(connection, matricula, excludeUserId = null) {
  if (!matricula) return;

  const query = excludeUserId
    ? "SELECT id_usuario FROM usuarios WHERE matricula = ? AND id_usuario <> ? LIMIT 1"
    : "SELECT id_usuario FROM usuarios WHERE matricula = ? LIMIT 1";

  const params = excludeUserId ? [matricula, excludeUserId] : [matricula];
  const [rows] = await connection.query(query, params);

  if (rows.length > 0) {
    throw new Error("La matrÃ­cula ya estÃ¡ registrada.");
  }
}

async function getCurrentUserWithRole(connection, id_usuario) {
  const [rows] = await connection.query(
    `SELECT U.*, R.nombre_rol
     FROM usuarios U
     INNER JOIN roles R ON U.id_rol = R.id_rol
     WHERE U.id_usuario = ?`,
    [id_usuario]
  );

  if (!rows.length) {
    throw new Error("Usuario no encontrado.");
  }

  return rows[0];
}

export const AdminUserService = {
  /**
   * ================================================================
   * Obtener todos los usuarios con sus roles
   * ================================================================
   */
  async getAllUsers() {
    return await AdminUserModel.findAllWithRoles();
  },

  /**
   * ================================================================
   * Crear un nuevo usuario desde el panel del admin
   * ================================================================
   */
  async createUser(data) {
    const pool = await poolPromise;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const nombreRol = await getRoleName(connection, data.id_rol);
      const esEstudiante = isStudentRole(nombreRol);
      const activationToken = randomBytes(32).toString("hex");
      const activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      data.correo = normalizeText(data.correo)?.toLowerCase() || null;
      data.telefono = normalizeText(data.telefono);
      data.matricula = normalizeText(data.matricula);
      data.grupo = normalizeText(data.grupo);

      if (data.correo && !isValidEmail(data.correo)) {
        throw new Error("Correo electrÃ³nico no vÃ¡lido.");
      }

      if (esEstudiante) {
        await ensureUniqueMatricula(connection, data.matricula);
        data.correo = null;
        data.telefono = null;
      } else {
        if (!data.correo) {
          throw new Error(`${nombreRol} requiere correo electrÃ³nico.`);
        }
        data.id_carrera = null;
        data.id_semestre = null;
        data.id_periodo = null;
        data.matricula = null;
        data.grupo = null;
        await ensureUniqueEmail(connection, data.correo);
      }

      data.contrasena = null;
      data.estado = "pending_activation";
      data.token_verificacion = activationToken;
      data.token_expira = activationExpires;

      const { insertId } = await AdminUserModel.createByAdmin(data, connection);

      if (esEstudiante) {
        await connection.query(
          `
          INSERT INTO trayectoria_academica
          (id_usuario, id_periodo, id_semestre, grupo, estado, repite)
          VALUES (?, ?, ?, ?, 'Activo', FALSE)
        `,
          [insertId, data.id_periodo, data.id_semestre, data.grupo]
        );
      }

      await connection.commit();

      return {
        message: "Usuario creado correctamente. Se generó su enlace de activación.",
        _tokens: [
          {
            id_usuario: insertId,
            identificador: esEstudiante ? data.matricula : data.correo,
            tipo_identificador: esEstudiante ? "Matrícula" : "Correo",
            nombre: buildFullName(data),
            rol: nombreRol,
            activation_token: activationToken,
          },
        ],
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * ================================================================
   * Actualizar datos de un usuario
   * ================================================================
   */
  async updateUser(id_usuario, data) {
    const pool = await poolPromise;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const usuarioActual = await getCurrentUserWithRole(connection, id_usuario);
      const nombreRolFinal = data.id_rol
        ? await getRoleName(connection, data.id_rol)
        : usuarioActual.nombre_rol;
      const esEstudianteFinal = isStudentRole(nombreRolFinal);

      data.correo = normalizeText(data.correo);
      data.telefono = normalizeText(data.telefono);
      data.matricula = normalizeText(data.matricula);
      data.grupo = normalizeText(data.grupo);
      data.id_periodo = normalizeText(data.id_periodo);

      const correoFinal =
        data.correo !== undefined ? data.correo : normalizeText(usuarioActual.correo);
      const matriculaFinal =
        data.matricula !== undefined ? data.matricula : normalizeText(usuarioActual.matricula);

      if (correoFinal && !isValidEmail(correoFinal)) {
        throw new Error("Correo electrÃ³nico no vÃ¡lido.");
      }

      if (esEstudianteFinal) {
        await ensureUniqueMatricula(connection, matriculaFinal, id_usuario);
        await ensureUniqueEmail(connection, correoFinal, id_usuario);
      } else {
        if (!correoFinal) {
          throw new Error(`${nombreRolFinal} requiere correo electrÃ³nico.`);
        }
        await ensureUniqueEmail(connection, correoFinal, id_usuario);
        data.id_carrera = null;
        data.id_semestre = null;
        data.id_periodo = null;
        data.matricula = null;
        data.grupo = null;
      }

      if (data.contrasena && data.contrasena.trim() !== "") {
        data.contrasena = await bcrypt.hash(data.contrasena, 12);
      } else {
        delete data.contrasena;
      }

      await AdminUserModel.updateByAdmin(id_usuario, data, connection);

      const [ultimaTrayectoria] = await connection.query(
        `
        SELECT id, id_periodo, id_semestre, grupo
        FROM trayectoria_academica
        WHERE id_usuario = ?
        ORDER BY id DESC
        LIMIT 1
      `,
        [id_usuario]
      );

      if (esEstudianteFinal) {
        const semestreFinal =
          data.id_semestre !== undefined ? data.id_semestre : usuarioActual.id_semestre;
        const grupoFinal =
          data.grupo !== undefined ? data.grupo : normalizeText(usuarioActual.grupo);

        if (ultimaTrayectoria.length) {
          const updates = [];
          const values = [];

          if (data.id_semestre !== undefined) {
            updates.push("id_semestre = ?");
            values.push(semestreFinal);
          }

          if (data.grupo !== undefined) {
            updates.push("grupo = ?");
            values.push(grupoFinal);
          }

          if (data.id_periodo) {
            updates.push("id_periodo = ?");
            values.push(data.id_periodo);
          }

          if (updates.length > 0) {
            values.push(ultimaTrayectoria[0].id);
            await connection.query(
              `
              UPDATE trayectoria_academica
              SET ${updates.join(", ")}
              WHERE id = ?
            `,
              values
            );
          }
        } else {
          if (!data.id_periodo) {
            throw new Error(
              "Estudiante requiere periodo para crear su trayectoria acadÃ©mica."
            );
          }

          await connection.query(
            `
            INSERT INTO trayectoria_academica
            (id_usuario, id_periodo, id_semestre, grupo, estado, repite)
            VALUES (?, ?, ?, ?, 'Activo', FALSE)
          `,
            [id_usuario, data.id_periodo, semestreFinal, grupoFinal]
          );
        }
      }

      await connection.commit();

      return { message: "Usuario actualizado correctamente." };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * ================================================================
   * Desactivar usuario (eliminaciÃ³n lÃ³gica)
   * ================================================================
   */
  async deleteUser(id_usuario) {
    await AdminUserModel.deleteUser(id_usuario);
    return { message: "Usuario desactivado correctamente." };
  },

  /**
   * ================================================================
   * Obtener lista de roles activos
   * ================================================================
   */
  async getRoles() {
    const pool = await poolPromise;
    return await RoleModel.findAll(pool);
  },

  /**
   * ================================================================
   * Obtener lista de carreras activas
   * ================================================================
   */
  async getCarreras() {
    return await AdminUserModel.findAllCarreras();
  },

  /**
   * ================================================================
   * Obtener lista de semestres activos
   * ================================================================
   */
  async getSemestres() {
    return await AdminUserModel.findAllSemestres();
  },

  async importFromExcel({
    buffer,
    id_rol,
    id_carrera,
    id_semestre,
    grupo,
    id_periodo,
    adminId,
    ip,
  }) {
    const pool = await poolPromise;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      if (!id_rol) throw new Error("Debe seleccionar un rol.");

      const nombreRol = await getRoleName(connection, id_rol);
      const esEstudiante = isStudentRole(nombreRol);
      const grupoNormalizado = normalizeText(grupo);

      if (esEstudiante) {
        if (!id_carrera || !id_semestre || !id_periodo) {
          throw new Error("Estudiante requiere carrera, semestre y periodo.");
        }
        if (!grupoNormalizado || !["A", "B"].includes(grupoNormalizado)) {
          throw new Error("Estudiante requiere grupo vÃ¡lido (A o B).");
        }
      }

      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) throw new Error("El archivo estÃ¡ vacÃ­o.");

      const insertados = [];
      const omitidos = [];

      for (const row of rows) {
        const a_paterno = row.a_paterno?.toString().trim().toUpperCase() || null;
        const a_materno = row.a_materno?.toString().trim().toUpperCase() || null;
        const nombre = row.nombre?.toString().trim().toUpperCase() || null;
        const matricula = normalizeText(row.matricula);
        const correo = normalizeText(row.correo)?.toLowerCase() || null;

        const identificador = esEstudiante ? matricula : correo;
        const labelIdentificador = esEstudiante ? "matrÃ­cula" : "correo";

        if (!a_paterno || !a_materno || !nombre || !identificador) {
          omitidos.push({
            fila: row,
            razon: `Faltan campos obligatorios (nombre, apellidos y ${labelIdentificador}).`,
          });
          continue;
        }

        if (correo && !isValidEmail(correo)) {
          omitidos.push({
            fila: row,
            razon: "El correo electrÃ³nico no tiene un formato vÃ¡lido.",
          });
          continue;
        }

        try {
          await ensureUniqueEmail(connection, correo);
          if (esEstudiante) {
            await ensureUniqueMatricula(connection, matricula);
          }
        } catch (error) {
          omitidos.push({
            fila: identificador,
            razon: error.message,
          });
          continue;
        }

        const activation_token = randomBytes(32).toString("hex");
        const activation_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const [result] = await connection.query(
          `INSERT INTO usuarios
            (id_rol, id_carrera, id_semestre, nombre, a_paterno, a_materno,
             correo, matricula, grupo, contrasena, estado,
             token_verificacion, token_expira, fecha_registro)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending_activation', ?, ?, NOW())`,
          [
            id_rol,
            esEstudiante ? id_carrera || null : null,
            esEstudiante ? id_semestre || null : null,
            nombre,
            a_paterno,
            a_materno,
            correo,
            esEstudiante ? matricula : null,
            esEstudiante ? grupoNormalizado : null,
            activation_token,
            activation_expires,
          ]
        );

        if (esEstudiante) {
          await connection.query(
            `INSERT INTO trayectoria_academica
              (id_usuario, id_periodo, id_semestre, grupo, estado, repite)
             VALUES (?, ?, ?, ?, 'Activo', FALSE)`,
            [result.insertId, id_periodo, id_semestre, grupoNormalizado]
          );
        }

        insertados.push({
          id_usuario: result.insertId,
          identificador,
          tipo_identificador: esEstudiante ? "MatrÃ­cula" : "Correo",
          nombre: buildFullName({ a_paterno, a_materno, nombre }),
          rol: nombreRol,
          activation_token,
        });
      }

      await connection.commit();

      return {
        message: "ImportaciÃ³n completada.",
        insertados: insertados.length,
        omitidos: omitidos.length,
        detalle_omitidos: omitidos,
        _tokens: insertados,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async generateTokensExcel(tokens, baseUrl) {
    const data = tokens.map((u) => ({
      tipo_identificador: u.tipo_identificador,
      identificador: u.identificador,
      nombre_completo: u.nombre,
      rol: u.rol,
      url_activacion: `${baseUrl}/activar?token=${u.activation_token}`,
      token: u.activation_token,
      expira_en: "24 horas",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 35 },
      { wch: 20 },
      { wch: 80 },
      { wch: 70 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tokens de activaciÃ³n");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  },

  async avanzarSemestrePersonalizado(
    id_periodo_origen,
    id_periodo_destino,
    estudiantes = []
  ) {
    const pool = await poolPromise;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [registros] = await connection.query(
        `
        SELECT ta.*
        FROM trayectoria_academica ta
        INNER JOIN (
          SELECT id_usuario, MAX(id) AS max_id
          FROM trayectoria_academica
          WHERE id_periodo = ?
          GROUP BY id_usuario
        ) ultimos ON ta.id = ultimos.max_id
        WHERE ta.estado = 'Activo'
      `,
        [id_periodo_origen]
      );

      if (!registros.length) {
        throw new Error("No hay estudiantes activos para procesar en ese periodo.");
      }

      const mapaAcciones = new Map();
      if (estudiantes.length > 0) {
        estudiantes.forEach((a) => {
          mapaAcciones.set(Number(a.id_usuario), a.accion);
        });
      }

      let procesados = 0;

      for (const estudiante of registros) {
        let accion = "AVANZAR";

        if (mapaAcciones.size > 0) {
          accion = mapaAcciones.get(estudiante.id_usuario);
          if (!accion) continue;
        }

        let nuevoSemestre = estudiante.id_semestre;
        let nuevoEstado = "Activo";
        let repite = false;

        if (accion === "AVANZAR") {
          nuevoSemestre = estudiante.id_semestre + 1;
        }

        if (accion === "REPETIR") {
          nuevoSemestre = estudiante.id_semestre;
          repite = true;
        }

        if (accion === "BAJA") {
          nuevoEstado = "Baja";
        }

        if (nuevoSemestre > 8) {
          nuevoEstado = "Egresado";
        }

        await connection.query(
          `
          INSERT INTO trayectoria_academica
          (id_usuario, id_periodo, id_semestre, grupo, estado, repite)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
          [
            estudiante.id_usuario,
            id_periodo_destino,
            nuevoSemestre,
            estudiante.grupo,
            nuevoEstado,
            repite,
          ]
        );

        if (accion !== "BAJA") {
          await connection.query(
            `
            UPDATE usuarios
            SET id_semestre = ?
            WHERE id_usuario = ?
          `,
            [nuevoSemestre, estudiante.id_usuario]
          );
        }

        procesados++;
      }

      await connection.commit();

      return {
        message: "Proceso ejecutado correctamente.",
        estudiantesProcesados: procesados,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getEstudiantesParaAvance(id_periodo) {
    const pool = await poolPromise;
    const [rows] = await pool.query(
      `
      SELECT
        ta.id,
        ta.id_usuario,
        ta.id_semestre,
        ta.grupo,
        u.nombre,
        u.a_paterno,
        u.a_materno,
        u.matricula,
        s.nombre_semestre
      FROM trayectoria_academica ta
      INNER JOIN (
        SELECT id_usuario, MAX(id) AS max_id
        FROM trayectoria_academica
        WHERE id_periodo = ?
        GROUP BY id_usuario
      ) ultimos ON ta.id = ultimos.max_id
      INNER JOIN usuarios u ON ta.id_usuario = u.id_usuario
      LEFT JOIN semestres s ON ta.id_semestre = s.id_semestre
      WHERE ta.estado = 'Activo'
      ORDER BY u.a_paterno ASC, u.a_materno ASC
    `,
      [id_periodo]
    );
    return rows;
  },

  async getFilteredUsers(filters) {
    return await AdminUserModel.findWithAdvancedFilters(filters);
  },

  async getOpcionesPorPeriodo(id_periodo) {
    const pool = await poolPromise;

    const [semestres] = await pool.query(
      `
      SELECT DISTINCT S.id_semestre, S.nombre_semestre
      FROM trayectoria_academica TA
      INNER JOIN semestres S ON TA.id_semestre = S.id_semestre
      WHERE TA.id_periodo = ? AND TA.estado = 'Activo'
      ORDER BY S.id_semestre ASC
    `,
      [id_periodo]
    );

    const [grupos] = await pool.query(
      `
      SELECT DISTINCT grupo
      FROM trayectoria_academica
      WHERE id_periodo = ? AND estado = 'Activo' AND grupo IS NOT NULL
      ORDER BY grupo ASC
    `,
      [id_periodo]
    );

    return {
      semestres,
      grupos: grupos.map((g) => g.grupo),
    };
  },
};
