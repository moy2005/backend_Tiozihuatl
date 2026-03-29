import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { poolPromise } from "../../../config/db.config.js";
import { AuditService } from "../../../core/services/audit.service.js";

const getIdentifier = (usuario) => usuario.matricula || usuario.correo || null;
const getIdentifierLabel = (usuario) =>
  usuario.matricula ? "MatrÃ­cula" : "Correo";

export const ActivationService = {
  /**
   * ================================================================
   * Activar cuenta con token
   * ================================================================
   */
  async activateAccount({ token, password, confirm_password }) {
    if (!token || !password || !confirm_password) {
      throw new Error("Token, contraseÃ±a y confirmaciÃ³n son requeridos.");
    }

    if (password !== confirm_password) {
      throw new Error("Las contraseÃ±as no coinciden.");
    }

    if (password.length < 8) {
      throw new Error("La contraseÃ±a debe tener al menos 8 caracteres.");
    }

    const pool = await poolPromise;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT id_usuario, estado, token_verificacion, token_expira, matricula, correo
         FROM usuarios
         WHERE token_verificacion = ?
         LIMIT 1`,
        [token]
      );

      if (!rows.length) {
        throw new Error("El token de activaciÃ³n no es vÃ¡lido.");
      }

      const usuario = rows[0];

      if (usuario.estado !== "pending_activation") {
        throw new Error(
          usuario.estado === "Activo"
            ? "Esta cuenta ya fue activada. Inicia sesiÃ³n normalmente."
            : "Esta cuenta no estÃ¡ disponible para activaciÃ³n."
        );
      }

      if (new Date() > new Date(usuario.token_expira)) {
        throw new Error("El token de activaciÃ³n ha expirado.");
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await connection.query(
        `UPDATE usuarios
         SET contrasena = ?, estado = 'Activo',
             token_verificacion = NULL, token_expira = NULL
         WHERE id_usuario = ?`,
        [passwordHash, usuario.id_usuario]
      );

      AuditService.logEvent({
        id_usuario: usuario.id_usuario,
        tipo_evento: "ACTIVACION_CUENTA",
        descripcion: `El usuario ${getIdentifier(usuario) || `#${usuario.id_usuario}`} activÃ³ su cuenta.`,
        ip_origen: null,
      }).catch((err) => console.warn("AuditorÃ­a no registrada:", err.message));

      await connection.commit();

      return { message: "Cuenta activada correctamente. Ya puedes iniciar sesiÃ³n." };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * ================================================================
   * Verificar si un token es vÃ¡lido
   * ================================================================
   */
  async verifyToken(token) {
    if (!token) throw new Error("Token requerido.");

    const pool = await poolPromise;
    const [rows] = await pool.query(
      `SELECT id_usuario, estado, token_expira, nombre, a_paterno, matricula, correo
       FROM usuarios
       WHERE token_verificacion = ?
       LIMIT 1`,
      [token]
    );

    if (!rows.length) {
      throw new Error("Token no vÃ¡lido.");
    }

    const usuario = rows[0];

    if (usuario.estado !== "pending_activation") {
      throw new Error(
        usuario.estado === "Activo"
          ? "Esta cuenta ya fue activada."
          : "Esta cuenta no estÃ¡ disponible para activaciÃ³n."
      );
    }

    if (new Date() > new Date(usuario.token_expira)) {
      throw new Error("El token ha expirado. Solicita uno nuevo al administrador.");
    }

    return {
      valid: true,
      nombre: usuario.nombre,
      a_paterno: usuario.a_paterno,
      identificador: getIdentifier(usuario),
      etiquetaIdentificador: getIdentifierLabel(usuario),
    };
  },

  /**
   * ================================================================
   * Regenerar token
   * ================================================================
   */
  async regenerateToken(id_usuario) {
    const pool = await poolPromise;
    const [rows] = await pool.query(
      `SELECT id_usuario, estado, matricula, correo
       FROM usuarios
       WHERE id_usuario = ?`,
      [id_usuario]
    );

    if (!rows.length) {
      throw new Error("Usuario no encontrado.");
    }

    const usuario = rows[0];

    if (usuario.estado === "Activo") {
      throw new Error("Este usuario ya activÃ³ su cuenta. No se puede regenerar el token.");
    }

    const newToken = randomBytes(32).toString("hex");
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE usuarios
       SET token_verificacion = ?,
           token_expira = ?,
           estado = 'pending_activation'
       WHERE id_usuario = ?`,
      [newToken, newExpires, id_usuario]
    );

    await AuditService.logEvent({
      id_usuario,
      tipo_evento: "REGENERACION_TOKEN_ACTIVACION",
      descripcion: `Se regenerÃ³ el token de activaciÃ³n para el usuario #${id_usuario} (${getIdentifier(usuario) || "sin identificador"}).`,
      ip_origen: null,
    });

    return {
      message: "Token regenerado correctamente.",
      identificador: getIdentifier(usuario),
      tipo_identificador: getIdentifierLabel(usuario),
      activation_token: newToken,
      expira_en: "24 horas",
    };
  },
};
