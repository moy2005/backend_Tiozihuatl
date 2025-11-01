import bcrypt from "bcryptjs";
import { poolPromise } from "../../../../config/db.config.js";

export const UserModel = {
  /**
   * PERFIL: Obtener datos completos del usuario con relaciones
   */
  async findById(id_usuario) {
    const pool = await poolPromise;
    const [rows] = await pool.query(
      `
      SELECT 
        U.id_usuario,
        U.nombre,
        U.a_paterno,
        U.a_materno,
        U.correo,
        U.telefono,
        U.matricula,
        U.estado,
        U.fecha_registro,
        U.ultima_conexion,
        R.nombre_rol AS rol,
        C.nombre_carrera AS carrera,
        S.nombre_semestre AS semestre
      FROM usuarios U
      LEFT JOIN roles R ON U.id_rol = R.id_rol
      LEFT JOIN carreras C ON U.id_carrera = C.id_carrera
      LEFT JOIN semestres S ON U.id_semestre = S.id_semestre
      WHERE U.id_usuario = ?
      `,
      [id_usuario]
    );

    const user = rows[0];
    if (!user) return null;

    // Normalización según el rol
    switch (user.rol) {
      case "Visitante":
        user.matricula = null;
        user.carrera = null;
        user.semestre = null;
        break;
      case "Bibliotecario":
        user.carrera = null;
        user.semestre = null;
        break;
      case "Docente":
        user.semestre = null;
        break;
    }

    return user;
  },

  /**
   * PERFIL: Actualizar datos según el rol
   */
  async updateProfile(id_usuario, data) {
    const pool = await poolPromise;

    const [rolRows] = await pool.query(
      `
      SELECT R.nombre_rol AS rol
      FROM usuarios U
      INNER JOIN roles R ON U.id_rol = R.id_rol
      WHERE U.id_usuario = ?
      `,
      [id_usuario]
    );

    const rol = rolRows[0]?.rol || "Visitante";
    const campos = [];
    const valores = [];

    if (rol === "Administrador" || rol === "Visitante") {
      if (data.nombre) campos.push("nombre = ?"), valores.push(data.nombre);
      if (data.a_paterno) campos.push("a_paterno = ?"), valores.push(data.a_paterno);
      if (data.a_materno) campos.push("a_materno = ?"), valores.push(data.a_materno);
      if (data.correo) campos.push("correo = ?"), valores.push(data.correo);
      if (data.telefono) campos.push("telefono = ?"), valores.push(data.telefono);
      // Solo el Admin puede modificar matrícula
      if (rol === "Administrador" && data.matricula) {
        campos.push("matricula = ?");
        valores.push(data.matricula);
      }
    } else {
      // Alumnos, Docentes y Bibliotecarios
      if (data.correo) campos.push("correo = ?"), valores.push(data.correo);
      if (data.telefono) campos.push("telefono = ?"), valores.push(data.telefono);
    }

    if (campos.length === 0) return;
    valores.push(id_usuario);

    await pool.query(
      `
      UPDATE usuarios
      SET ${campos.join(", ")}, ultima_conexion = NOW()
      WHERE id_usuario = ?
      `,
      valores
    );
  },

  /**
   * PERFIL: Cambiar contraseña
   */
  async updatePassword(id_usuario, nuevaContrasena) {
    const pool = await poolPromise;
    const hash = await bcrypt.hash(nuevaContrasena, 12);
    await pool.query(
      `UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?`,
      [hash, id_usuario]
    );
  },
};
