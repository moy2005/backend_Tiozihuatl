import bcrypt from "bcryptjs"; // para hash de contraseñas
import { poolPromise } from "../../../../config/db.config.js"; // conexión MySQL (promesa)

export const UserModel = {
  /**
   * ================================================================
   * PERFIL: Obtener datos completos del usuario (con relaciones)
   * ================================================================
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
    return rows[0];
  },

  /**
   * ================================================================
   * PERFIL: Actualizar datos según el rol
   * ================================================================
   */
  async updateProfile(id_usuario, data) {
    const pool = await poolPromise;

    // Obtener el rol actual
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

    // 🔓 Visitante y Administrador pueden editar todo
    if (rol === "Visitante" || rol === "Administrador") {
      if (data.nombre) campos.push("nombre = ?"), valores.push(data.nombre);
      if (data.a_paterno) campos.push("a_paterno = ?"), valores.push(data.a_paterno);
      if (data.a_materno) campos.push("a_materno = ?"), valores.push(data.a_materno);
      if (data.correo) campos.push("correo = ?"), valores.push(data.correo);
      if (data.telefono) campos.push("telefono = ?"), valores.push(data.telefono);
      if (data.matricula) campos.push("matricula = ?"), valores.push(data.matricula);
    } else {
      // Otros roles (Alumno, Docente, Bibliotecario)
      if (data.correo) campos.push("correo = ?"), valores.push(data.correo);
      if (data.telefono) campos.push("telefono = ?"), valores.push(data.telefono);
      if (data.matricula) campos.push("matricula = ?"), valores.push(data.matricula);
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
   * ================================================================
   * PERFIL: Actualizar contraseña del usuario
   * ================================================================
   */
  async updatePassword(id_usuario, nuevaContrasena) {
    const pool = await poolPromise;
    const hash = await bcrypt.hash(nuevaContrasena, 12);
    await pool.query(
      `
      UPDATE usuarios
      SET contrasena = ?
      WHERE id_usuario = ?
      `,
      [hash, id_usuario]
    );
  },

};
