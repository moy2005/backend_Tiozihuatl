import bcrypt from "bcryptjs";
import { poolPromise } from "../../../../config/db.config.js";
import { AdminUserModel } from "../models/user.model.js"; // modelo del admin
import { RoleModel } from "../models/role.model.js"; // modelo de roles
import XLSX from "xlsx";


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

    const [existing] = await connection.query(
      "SELECT id_usuario FROM usuarios WHERE correo = ?",
      [data.correo]
    );

    if (existing.length > 0) {
      throw new Error("El correo ya está registrado.");
    }

    const hash = await bcrypt.hash(data.contrasena, 12);
    data.contrasena = hash;

    const { insertId } = await AdminUserModel.createByAdmin(data);

    // 🔥 Crear trayectoria inicial si es alumno
    const [rol] = await connection.query(
      "SELECT nombre_rol FROM roles WHERE id_rol = ?",
      [data.id_rol]
    );

    if (rol[0].nombre_rol === "Alumno") {

      await connection.query(`
        INSERT INTO trayectoria_academica
        (id_usuario, id_periodo, id_semestre, grupo, estado, repite)
        VALUES (?, ?, ?, ?, 'Activo', FALSE)
      `, [
        insertId,
        data.id_periodo,
        data.id_semestre,
        data.grupo
      ]);
    }

    await connection.commit();

    return { message: "Usuario creado correctamente." };

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

    // 🔐 Encriptar contraseña si viene
    if (data.contrasena && data.contrasena.trim() !== '') {
      const hash = await bcrypt.hash(data.contrasena, 12);
      data.contrasena = hash;
    } else {
      delete data.contrasena;
    }

    // 🔎 Obtener rol actual
    const [usuarioActual] = await connection.query(
      `SELECT id_rol FROM usuarios WHERE id_usuario = ?`,
      [id_usuario]
    );

    if (!usuarioActual.length) {
      throw new Error("Usuario no encontrado.");
    }

    const [rol] = await connection.query(
      `SELECT nombre_rol FROM roles WHERE id_rol = ?`,
      [usuarioActual[0].id_rol]
    );

    const esAlumno = rol[0].nombre_rol === "Alumno";

    // 🔹 Actualizar snapshot
    await AdminUserModel.updateByAdmin(id_usuario, data);

    // 🔥 Si es alumno y cambió semestre, grupo o periodo → actualizar trayectoria
    // ✅ CAMBIO: añadido data.id_periodo a la condición
    if (esAlumno && (data.id_semestre || data.grupo || data.id_periodo)) {

      // Obtener último registro de trayectoria
      const [ultimaTrayectoria] = await connection.query(`
        SELECT id
        FROM trayectoria_academica
        WHERE id_usuario = ?
        ORDER BY id DESC
        LIMIT 1
      `, [id_usuario]);

      if (ultimaTrayectoria.length) {

        const updates = [];
        const values = [];

        if (data.id_semestre) {
          updates.push("id_semestre = ?");
          values.push(data.id_semestre);
        }

        if (data.grupo) {
          updates.push("grupo = ?");
          values.push(data.grupo);
        }

        // ✅ CAMBIO: actualizar periodo en trayectoria si viene
        if (data.id_periodo) {
          updates.push("id_periodo = ?");
          values.push(data.id_periodo);
        }

        if (updates.length > 0) {
          values.push(ultimaTrayectoria[0].id);

          await connection.query(`
            UPDATE trayectoria_academica
            SET ${updates.join(", ")}
            WHERE id = ?
          `, values);
        }
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
   * Desactivar usuario (eliminación lógica)
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
  
async importFromExcel({ buffer, id_rol, id_carrera, id_semestre, grupo, id_periodo }) {

  const pool = await poolPromise;
  const connection = await pool.getConnection();

  try {

    if (!id_rol) throw new Error("Debe seleccionar un rol.");

    const [rolResult] = await connection.query(
      "SELECT nombre_rol FROM roles WHERE id_rol = ? AND estado = 'Activo'",
      [id_rol]
    );

    if (!rolResult.length) throw new Error("Rol inválido.");

    const nombreRol = rolResult[0].nombre_rol;

    if (nombreRol === "Alumno") {
      if (!id_carrera || !id_semestre || !id_periodo) {
        throw new Error("Alumno requiere carrera, semestre y periodo.");
      }

      if (!grupo || !["A", "B"].includes(grupo)) {
        throw new Error("Alumno requiere grupo válido (A o B).");
      }
    }

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) throw new Error("El archivo está vacío.");

    let insertados = 0;

    await connection.beginTransaction();

    for (const row of rows) {

      const a_paterno = row.a_paterno?.toString().trim().toUpperCase();
      const a_materno = row.a_materno?.toString().trim().toUpperCase();
      const nombre = row.nombre?.toString().trim().toUpperCase();
      const matricula = row.matricula?.toString().trim() || null;

      if (!a_paterno || !a_materno || !nombre) continue;

      const correoGenerado =
        nombre.replace(/\s+/g, "").toLowerCase() +
        `.${Date.now()}@institucion.edu`;

      const passwordHash = await bcrypt.hash("12345678", 12);

      const [result] = await connection.query(
        `INSERT INTO usuarios
        (id_rol, id_carrera, id_semestre, nombre, a_paterno, a_materno,
         correo, matricula, grupo, contrasena, estado, fecha_registro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo', NOW())`,
        [
          id_rol,
          id_carrera,
          id_semestre,
          nombre,
          a_paterno,
          a_materno,
          correoGenerado,
          matricula,
          grupo,
          passwordHash,
        ]
      );

      // 🔥 Insertar trayectoria
      if (nombreRol === "Alumno") {
        await connection.query(`
          INSERT INTO trayectoria_academica
          (id_usuario, id_periodo, id_semestre, grupo, estado, repite)
          VALUES (?, ?, ?, ?, 'Activo', FALSE)
        `, [
          result.insertId,
          id_periodo,
          id_semestre,
          grupo
        ]);
      }

      insertados++;
    }

    await connection.commit();

    return {
      message: "Importación completada",
      insertados
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
},

async avanzarSemestrePersonalizado(id_periodo_origen, id_periodo_destino, alumnos = []) {

  const pool = await poolPromise;
  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    // 🔎 Obtener últimos registros activos del periodo ORIGEN
    const [registros] = await connection.query(`
      SELECT ta.*
      FROM trayectoria_academica ta
      INNER JOIN (
        SELECT id_usuario, MAX(id) as max_id
        FROM trayectoria_academica
        WHERE id_periodo = ?
        GROUP BY id_usuario
      ) ultimos ON ta.id = ultimos.max_id
      WHERE ta.estado = 'Activo'
    `, [id_periodo_origen]);

    if (!registros.length) {
      throw new Error("No hay alumnos activos para procesar en ese periodo.");
    }

    // 🔹 Mapear acciones individuales
    const mapaAcciones = new Map();
    if (alumnos.length > 0) {
      alumnos.forEach(a => {
        mapaAcciones.set(Number(a.id_usuario), a.accion);
      });
    }

    let procesados = 0;

    for (const alumno of registros) {

      let accion = "AVANZAR";

      if (mapaAcciones.size > 0) {
        accion = mapaAcciones.get(alumno.id_usuario);
        if (!accion) continue; // no seleccionado
      }

      let nuevoSemestre = alumno.id_semestre;
      let nuevoEstado = "Activo";
      let repite = false;

      if (accion === "AVANZAR") {
        nuevoSemestre = alumno.id_semestre + 1;
      }

      if (accion === "REPETIR") {
        nuevoSemestre = alumno.id_semestre;
        repite = true;
      }

      if (accion === "BAJA") {
        nuevoEstado = "Baja";
      }

      if (nuevoSemestre > 8) {
        nuevoEstado = "Egresado";
      }

      // 🔥 Insertar nuevo registro histórico con el periodo DESTINO
      await connection.query(`
        INSERT INTO trayectoria_academica
        (id_usuario, id_periodo, id_semestre, grupo, estado, repite)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        alumno.id_usuario,
        id_periodo_destino,
        nuevoSemestre,
        alumno.grupo,
        nuevoEstado,
        repite
      ]);

      // 🔹 Actualizar snapshot en usuarios solo si no es baja
      if (accion !== "BAJA") {
        await connection.query(`
          UPDATE usuarios
          SET id_semestre = ?
          WHERE id_usuario = ?
        `, [nuevoSemestre, alumno.id_usuario]);
      }

      procesados++;
    }

    await connection.commit();

    return {
      message: "Proceso ejecutado correctamente.",
      alumnosProcesados: procesados
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
},

async getAlumnosParaAvance(id_periodo) {
  const pool = await poolPromise;
  const [rows] = await pool.query(`
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
      SELECT id_usuario, MAX(id) as max_id
      FROM trayectoria_academica
      WHERE id_periodo = ?
      GROUP BY id_usuario
    ) ultimos ON ta.id = ultimos.max_id
    INNER JOIN usuarios u ON ta.id_usuario = u.id_usuario
    LEFT JOIN semestres s ON ta.id_semestre = s.id_semestre
    WHERE ta.estado = 'Activo'
    ORDER BY u.a_paterno ASC, u.a_materno ASC
  `, [id_periodo]);
  return rows;
},

async getFilteredUsers(filters) {
  return await AdminUserModel.findWithAdvancedFilters(filters);
},

async getOpcionesPorPeriodo(id_periodo) {
  const pool = await poolPromise;

  const [semestres] = await pool.query(`
    SELECT DISTINCT S.id_semestre, S.nombre_semestre
    FROM trayectoria_academica TA
    INNER JOIN semestres S ON TA.id_semestre = S.id_semestre
    WHERE TA.id_periodo = ? AND TA.estado = 'Activo'
    ORDER BY S.id_semestre ASC
  `, [id_periodo]);

  const [grupos] = await pool.query(`
    SELECT DISTINCT grupo
    FROM trayectoria_academica
    WHERE id_periodo = ? AND estado = 'Activo' AND grupo IS NOT NULL
    ORDER BY grupo ASC
  `, [id_periodo]);

  return {
    semestres,
    grupos: grupos.map(g => g.grupo)
  };
},

};