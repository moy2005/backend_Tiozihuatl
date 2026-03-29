import bcrypt from "bcryptjs";
import { poolPromise } from "../../../../config/db.config.js";

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const UserModel = {
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
        U.grupo,
        CASE WHEN U.palabra_secreta IS NOT NULL THEN TRUE ELSE FALSE END AS tiene_palabra_secreta,
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

    if (typeof user.rol === "string") {
      user.rol = user.rol.trim();
    }

    switch (normalizeRole(user.rol)) {
      case "visitante":
      case "bibliotecario":
      case "docente":
        user.matricula = null;
        user.grupo = null;
        user.carrera = null;
        user.semestre = null;
        break;
      default:
        break;
    }

    return user;
  },

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

    const rol = normalizeRole(rolRows[0]?.rol || "Visitante");
    const campos = [];
    const valores = [];
    const palabraSecreta =
      typeof data.palabra_secreta === "string" ? data.palabra_secreta.trim() : "";

    if (rol === "administrador" || rol === "visitante") {
      if (data.nombre) campos.push("nombre = ?"), valores.push(data.nombre);
      if (data.a_paterno) campos.push("a_paterno = ?"), valores.push(data.a_paterno);
      if (data.a_materno) campos.push("a_materno = ?"), valores.push(data.a_materno);
      if (data.correo) campos.push("correo = ?"), valores.push(data.correo);
      if (data.telefono) campos.push("telefono = ?"), valores.push(data.telefono);

      if (rol === "administrador" && data.matricula) {
        campos.push("matricula = ?");
        valores.push(data.matricula);
      }
    } else {
      if (data.correo) campos.push("correo = ?"), valores.push(data.correo);
      if (data.telefono) campos.push("telefono = ?"), valores.push(data.telefono);
    }

    if (palabraSecreta) {
      const palabraSecretaHash = await bcrypt.hash(palabraSecreta, 12);
      campos.push("palabra_secreta = ?");
      valores.push(palabraSecretaHash);
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

  async updatePassword(id_usuario, nuevaContrasena) {
    const pool = await poolPromise;
    const hash = await bcrypt.hash(nuevaContrasena, 12);

    await pool.query(
      "UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?",
      [hash, id_usuario]
    );
  },
};
