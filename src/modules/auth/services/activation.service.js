import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";
import { AuditService } from "../../../core/services/audit.service.js";
import { randomBytes } from "crypto";

export const ActivationService = {

  /**
   * ================================================================
   * Activar cuenta con token
   * ================================================================
   */
 async activateAccount({ token, password, confirm_password }) {

    if (!token || !password || !confirm_password) {
      throw new Error("Token, contraseña y confirmación son requeridos.");
    }

    if (password !== confirm_password) {
      throw new Error("Las contraseñas no coinciden.");
    }

    if (password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres.");
    }

    const pool       = await poolPromise;
    const connection = await pool.getConnection();

    try {

      await connection.beginTransaction();

      // 1️⃣ Buscar usuario por token
  
      const [rows] = await connection.query(
        `SELECT id_usuario, estado, token_verificacion, token_expira, matricula
         FROM usuarios WHERE token_verificacion = ? LIMIT 1`,
        [token]
      );
 

      if (!rows.length) throw new Error("El token de activación no es válido.");

      const usuario = rows[0];

      if (usuario.estado !== "pending_activation") {
        throw new Error(
          usuario.estado === "Activo"
            ? "Esta cuenta ya fue activada. Inicia sesión normalmente."
            : "Esta cuenta no está disponible para activación."
        );
      }

      const ahora  = new Date();
      const expira = new Date(usuario.token_expira);
      if (ahora > expira) throw new Error("El token de activación ha expirado.");

      // 4️⃣ Hashear contraseña
  
      const passwordHash = await bcrypt.hash(password, 10);
  

      // 5️⃣ Update
   
      await connection.query(
        `UPDATE usuarios
         SET contrasena = ?, estado = 'Activo',
             token_verificacion = NULL, token_expira = NULL
         WHERE id_usuario = ?`,
        [passwordHash, usuario.id_usuario]
      );
  

      // 6️⃣ Auditoría
 
        AuditService.logEvent({
        id_usuario  : usuario.id_usuario,
        tipo_evento : "ACTIVACION_CUENTA",
        descripcion : `El usuario con matrícula ${usuario.matricula} activó su cuenta.`,
        ip_origen   : null,
      }).catch(err => console.warn("⚠️ Auditoría no registrada:", err.message));

      await connection.commit();
      

      return { message: "Cuenta activada correctamente. Ya puedes iniciar sesión." };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * ================================================================
   * Verificar si un token es válido (para el frontend, antes de
   * mostrar el formulario de contraseña)
   * ================================================================
   */
  async verifyToken(token) {

    if (!token) throw new Error("Token requerido.");

    const pool = await poolPromise;

    const [rows] = await pool.query(
      `SELECT id_usuario, estado, token_expira, nombre, a_paterno, matricula
       FROM usuarios
       WHERE token_verificacion = ?
       LIMIT 1`,
      [token]
    );

    if (!rows.length) {
      throw new Error("Token no válido.");
    }

    const usuario = rows[0];

    if (usuario.estado !== "pending_activation") {
      throw new Error(
        usuario.estado === "Activo"
          ? "Esta cuenta ya fue activada."
          : "Esta cuenta no está disponible para activación."
      );
    }

    if (new Date() > new Date(usuario.token_expira)) {
      throw new Error("El token ha expirado. Solicita uno nuevo al administrador.");
    }

    // Solo devolvemos lo necesario para que el frontend
    // pueda mostrar el nombre del estudiante en el formulario
    return {
      valid    : true,
      nombre   : usuario.nombre,
      a_paterno: usuario.a_paterno,
      matricula: usuario.matricula,
    };
  },

  /**
   * ================================================================
   * Regenerar token (el admin lo llama cuando el estudiante perdió
   * su token o expiró)
   * ================================================================
   */
  async regenerateToken(id_usuario) {

    const pool = await poolPromise;

    const [rows] = await pool.query(
      `SELECT id_usuario, estado, matricula FROM usuarios WHERE id_usuario = ?`,
      [id_usuario]
    );

    if (!rows.length) {
      throw new Error("Usuario no encontrado.");
    }

    const usuario = rows[0];

    if (usuario.estado === "Activo") {
      throw new Error("Este usuario ya activó su cuenta. No se puede regenerar el token.");
    }

    const newToken   = randomBytes(32).toString("hex");
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE usuarios
       SET token_verificacion = ?,
           token_expira       = ?,
           estado             = 'pending_activation'
       WHERE id_usuario = ?`,
      [newToken, newExpires, id_usuario]
    );

    await AuditService.logEvent({
      id_usuario  : id_usuario,
      tipo_evento : "REGENERACION_TOKEN_ACTIVACION",
      descripcion : `Se regeneró el token de activación para el usuario #${id_usuario} (${usuario.matricula}).`,
      ip_origen   : null,
    });

    return {
      message          : "Token regenerado correctamente.",
      matricula        : usuario.matricula,
      activation_token : newToken,
      expira_en        : "24 horas",
    };
  },

};
