import { poolPromise } from "../../../config/db.config.js";

export const UserModel = {
  /**
   * ================================================================
   * Crear usuario genérico (normalmente para OAuth u otros roles)
   * ================================================================
   */
  async create({
    nombre,
    a_paterno,
    a_materno,
    correo,
    telefono,
    contrasena,
    metodo_autenticacion = null,
    proveedor_oauth = null,
    id_rol = 4, // Visitante por defecto
    palabra_secreta = null,
  }) {
    try {
      await poolPromise.query(
        `INSERT INTO usuarios 
          (id_rol, nombre, a_paterno, a_materno, correo, telefono, contrasena, metodo_autenticacion, proveedor_oauth, palabra_secreta, estado, fecha_registro)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo', NOW())`,
        [
          id_rol,
          nombre,
          a_paterno,
          a_materno,
          correo,
          telefono,
          contrasena,
          metodo_autenticacion,
          proveedor_oauth,
          palabra_secreta,
        ]
      );
    } catch (err) {
      console.error("❌ Error al crear usuario:", err.message);
    }
  },

  /**
   * ================================================================
   * Crear usuario visitante (registro manual)
   * ================================================================
   */
  async createVisitante(data) {
    try {
      // Buscar ID del rol Visitante
      const [roles] = await poolPromise.query(
        "SELECT id_rol FROM roles WHERE nombre_rol = 'Visitante' LIMIT 1"
      );
      const id_rol = roles[0]?.id_rol || 4; // por si acaso

      await poolPromise.query(
        `INSERT INTO usuarios 
          (id_rol, nombre, a_paterno, a_materno, correo, telefono, contrasena, palabra_secreta, estado, fecha_registro)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activo', NOW())`,
        [
          id_rol,
          data.nombre,
          data.a_paterno,
          data.a_materno,
          data.correo,
          data.telefono,
          data.contrasena,
          data.palabra_secreta,
        ]
      );
    } catch (err) {
      console.error("❌ Error al crear visitante:", err.message);
    }
  },

  /**
   * ================================================================
   * Buscar usuario por correo (usado en OAuth y validaciones)
   * ================================================================
   */
  async findByEmail(correo) {
    try {
      const [rows] = await poolPromise.query(
        `SELECT 
          U.id_usuario,
          U.nombre,
          U.a_paterno,
          U.a_materno,
          U.correo,
          U.telefono,
          U.contrasena,
          R.nombre_rol
         FROM usuarios U
         INNER JOIN roles R ON U.id_rol = R.id_rol
         WHERE U.correo = ?
         LIMIT 1`,
        [correo]
      );
      return rows[0] || null;
    } catch (err) {
      console.error("❌ Error al buscar usuario por correo:", err.message);
      return null;
    }
  },

  /**
   * ================================================================
   * Buscar usuario por credencial (correo o matrícula según rol)
   * Incluye nombre de rol, carrera y semestre
   * ================================================================
   */
  async findByCredential(credential, rolSeleccionado) {
    try {
      const campo = rolSeleccionado === "Visitante" ? "correo" : "matricula";

      const [rows] = await poolPromise.query(
        `SELECT 
          U.id_usuario,
          U.nombre,
          U.a_paterno,
          U.a_materno,
          U.correo,
          U.matricula,
          U.telefono,
          U.contrasena,
          R.nombre_rol,
          C.nombre_carrera AS carrera,
          S.nombre_semestre
         FROM usuarios U
         INNER JOIN roles R ON U.id_rol = R.id_rol
         LEFT JOIN carreras C ON U.id_carrera = C.id_carrera
         LEFT JOIN semestres S ON U.id_semestre = S.id_semestre
         WHERE U.${campo} = ?
         LIMIT 1`,
        [credential]
      );

      return rows[0] || null;
    } catch (err) {
      console.error("❌ Error al buscar por credencial:", err.message);
      return null;
    }
  },
};
