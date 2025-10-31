import { poolPromise } from "../../../../config/db.config.js";

export const AdminUserModel = {
  /**
   * ================================================================
   * ADMIN: Obtener todos los usuarios con detalle completo
   * ================================================================
   */
  async findAllWithRoles() {
    const pool = await poolPromise;
    const [rows] = await pool.query(`
      SELECT 
        U.id_usuario,
        U.nombre,
        U.a_paterno,
        U.a_materno,
        U.correo,
        U.telefono,
        U.matricula,
        U.estado,
        R.nombre_rol AS rol,
        C.nombre_carrera AS carrera,
        S.nombre_semestre AS semestre
      FROM usuarios U
      LEFT JOIN roles R ON U.id_rol = R.id_rol
      LEFT JOIN carreras C ON U.id_carrera = C.id_carrera
      LEFT JOIN semestres S ON U.id_semestre = S.id_semestre
      ORDER BY U.fecha_registro DESC
    `);
    return rows;
  },

  /**
   * ================================================================
   * ADMIN: Crear usuario (para cualquier rol)
   * ================================================================
   */
  async createByAdmin(data) {
    const pool = await poolPromise;
    await pool.query(
      `
      INSERT INTO usuarios (
        id_rol,
        id_carrera,
        id_semestre,
        nombre,
        a_paterno,
        a_materno,
        correo,
        telefono,
        matricula,
        contrasena,
        estado,
        fecha_registro
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo', NOW())
      `,
      [
        data.id_rol,
        data.id_carrera || null,
        data.id_semestre || null,
        data.nombre,
        data.a_paterno,
        data.a_materno,
        data.correo,
        data.telefono,
        data.matricula || null,
        data.contrasena,
      ]
    );
  },

  /**
   * ================================================================
   * ADMIN: Actualizar usuario completo
   * ================================================================
   */
  async updateByAdmin(id_usuario, data) {
    const pool = await poolPromise;
    await pool.query(
      `
      UPDATE usuarios
      SET 
        id_rol = ?,
        id_carrera = ?,
        id_semestre = ?,
        nombre = ?,
        a_paterno = ?,
        a_materno = ?,
        correo = ?,
        telefono = ?,
        matricula = ?,
        estado = ?
      WHERE id_usuario = ?
      `,
      [
        data.id_rol,
        data.id_carrera || null,
        data.id_semestre || null,
        data.nombre,
        data.a_paterno,
        data.a_materno,
        data.correo,
        data.telefono,
        data.matricula || null,
        data.estado,
        id_usuario,
      ]
    );
  },

  /**
   * ================================================================
   * ADMIN: Desactivar usuario
   * ================================================================
   */
  async deleteUser(id_usuario) {
    const pool = await poolPromise;
    await pool.query(
      `
      UPDATE usuarios
      SET estado = 'Inactivo'
      WHERE id_usuario = ?
      `,
      [id_usuario]
    );
  },
};
