import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendMail } from "../../../core/services/mail.service.js";
import { buildPasswordRecoveryEmail } from "../../../core/templates/auth-email.templates.js";
import { poolPromise } from "../../../config/db.config.js";

const getMexicoDate = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" })
  );
};

const formatDateTimeSql = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const getNowMexicoSql = () => formatDateTimeSql(getMexicoDate());

const getFutureMexicoSql = (minutesAhead) => {
  const future = getMexicoDate();
  future.setMinutes(future.getMinutes() + minutesAhead);
  return formatDateTimeSql(future);
};

export const PasswordService = {

  /**
   * ================================================================
   * ENVIAR ENLACE DE RECUPERACIÓN (correo + palabra secreta)
   * ================================================================
   */
  async sendRecoveryEmail(correo, palabra_secreta) {

    // === 0) LIMITAR A 3 INTENTOS CADA 5 MIN ===
    const [intentos] = await poolPromise.query(
      `SELECT COUNT(*) AS total 
       FROM recovery_requests 
       WHERE correo = ?
       AND fecha > (NOW() - INTERVAL 5 MINUTE)`,
      [correo]
    );

    if (intentos[0].total >= 3) {
      return {
        message: "Ya solicitaste varios enlaces. Intenta nuevamente más tarde."
      };
    }

    // Registrar intento SIEMPRE
    await poolPromise.query(
      "INSERT INTO recovery_requests (correo) VALUES (?)",
      [correo]
    );

    // === 1) BUSCAR USUARIO ===
    const mensajeGeneral =
      "Si los datos son correctos, se envió un enlace de recuperación.";

    const [rows] = await poolPromise.query(
      `SELECT id_usuario, nombre, estado, palabra_secreta 
       FROM usuarios 
       WHERE correo = ? 
       LIMIT 1`,
      [correo]
    );

    // Usuario no existe
    if (rows.length === 0) return { message: mensajeGeneral };

    const usuario = rows[0];

    // Usuario inactivo
    if (usuario.estado !== "Activo") return { message: mensajeGeneral };

    // === 2) VALIDAR PALABRA SECRETA ===
    if (!usuario.palabra_secreta) {
      return {
        error: true,
        message:
          "Tu cuenta aun no tiene palabra secreta configurada. Inicia sesion y registrala desde tu perfil.",
      };
    }

    const palabraCorrecta = await bcrypt.compare(
      palabra_secreta,
      usuario.palabra_secreta
    );

    if (!palabraCorrecta) {
      return {
        error: true,
        message: "La palabra secreta es incorrecta.",
      };
    }

    // Si ya existe un enlace vigente, Brevo se encargara de reintentar su entrega.
    // No generar otro correo evita empeorar limites temporales del proveedor destino.
    const nowMexico = getNowMexicoSql();
    const [activeRecoveryLinks] = await poolPromise.query(
      `SELECT token
       FROM recovery_links
       WHERE id_usuario = ?
       AND expiracion > ?
       LIMIT 1`,
      [usuario.id_usuario, nowMexico]
    );

    if (activeRecoveryLinks.length > 0) {
      return { message: mensajeGeneral };
    }


    // === 3) GENERAR TOKEN ===
    const token = crypto.randomUUID();
    const expiracion = getFutureMexicoSql(15);

    const frontendUrl = String(process.env.FRONTEND_URL || "").replace(
      /\/+$/,
      ""
    );
    if (!frontendUrl) {
      return {
        error: true,
        serviceUnavailable: true,
        message:
          "El envio de correos no esta disponible temporalmente. Intenta mas tarde.",
      };
    }

    await poolPromise.query(
      `INSERT INTO recovery_links (id_usuario, token, expiracion)
       VALUES (?, ?, ?)`,
      [usuario.id_usuario, token, expiracion]
    );

    const link = `${frontendUrl}/reset-password?token=${encodeURIComponent(
      token
    )}`;

    // === 4) ENVIAR CORREO ===
    const mailOptions = {
      to: correo,
      subject: "Restablece la contraseña de tu cuenta",
      text: `Hola ${usuario.nombre}. Recibimos una solicitud para restablecer tu contraseña de Tiozihuatl. Usa este enlace dentro de los próximos 15 minutos: ${link}. Si no realizaste la solicitud, ignora este correo.`,
      tags: ["recuperacion-contrasena"],
      html: buildPasswordRecoveryEmail({
        name: usuario.nombre,
        actionUrl: link,
      }),
    };

    const mailResult = await sendMail(mailOptions);

    if (!mailResult.success) {
      await poolPromise.query(
        "DELETE FROM recovery_links WHERE token = ?",
        [token]
      );
      console.error(
        "No se pudo enviar el correo de recuperacion:",
        mailResult.code || mailResult.error
      );
      return {
        error: true,
        serviceUnavailable: true,
        message:
          "No fue posible enviar el correo de recuperacion. Intenta nuevamente en unos minutos.",
      };
    }

    return { message: mensajeGeneral };
  },

  /**
   * ================================================================
   * VALIDAR TOKEN
   * ================================================================
   */
  async validateRecoveryToken(token) {
    const nowMexico = getNowMexicoSql();
    const [rows] = await poolPromise.query(
      `SELECT id_usuario
       FROM recovery_links
       WHERE token = ?
       AND expiracion > ?
       LIMIT 1`,
      [token, nowMexico]
    );

    return { valid: rows.length > 0 };
  },


  /**
   * ================================================================
   * RESTABLECER CONTRASEÑA POR TOKEN
   * ================================================================
   */
  async resetPasswordByToken(token, nuevaContrasena) {
    const nowMexico = getNowMexicoSql();

    const [rows] = await poolPromise.query(
      `SELECT id_usuario
       FROM recovery_links
       WHERE token = ?
       AND expiracion > ?
       LIMIT 1`,
      [token, nowMexico]
    );

    if (rows.length === 0) {
      throw new Error("El enlace es inválido o ha expirado.");
    }

    const id_usuario = rows[0].id_usuario;

    const hash = await bcrypt.hash(nuevaContrasena, 12);

    await poolPromise.query(
      "UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?",
      [hash, id_usuario]
    );

    await poolPromise.query(
      "DELETE FROM recovery_links WHERE token = ?",
      [token]
    );

    return { message: "Contraseña restablecida correctamente." };
  }

};
