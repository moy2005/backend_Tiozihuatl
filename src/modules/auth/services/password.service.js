import crypto from "crypto";
import bcrypt from "bcryptjs";
import { transporter } from "../../../config/email.config.js";
import { poolPromise } from "../../../config/db.config.js";

export const PasswordService = {

  /**
   * ================================================================
   * ENVIAR ENLACE DE RECUPERACIÓN (correo + palabra secreta)
   * ================================================================
   */
  async sendRecoveryEmail(correo, palabra_secreta) {

    // ============================================================
    // 0) LIMITAR A 3 INTENTOS POR 5 MINUTOS
    // ============================================================
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

    // Registrar intento SIEMPRE, aunque falle
    await poolPromise.query(
      "INSERT INTO recovery_requests (correo) VALUES (?)",
      [correo]
    );

    // ============================================================
    // 1) BUSCAR USUARIO (sin revelar información)
    // ============================================================
    const mensajeGeneral =
      "Si los datos son correctos, se envió un enlace de recuperación.";

    const [rows] = await poolPromise.query(
      `SELECT id_usuario, nombre, estado, palabra_secreta 
       FROM usuarios 
       WHERE correo = ? 
       LIMIT 1`,
      [correo]
    );

    // Si no existe → mensaje general
    if (rows.length === 0) return { message: mensajeGeneral };

    const usuario = rows[0];

    // Si está inactivo → mensaje general
    if (usuario.estado !== "Activo") return { message: mensajeGeneral };

    // ============================================================
    // 2) VALIDAR PALABRA SECRETA
    // ============================================================
    if (!palabra_secreta || palabra_secreta.trim() === "") {
      return { message: mensajeGeneral };
    }

    if (usuario.palabra_secreta !== palabra_secreta) {
      return { message: mensajeGeneral };
    }

    // ============================================================
    // 3) GENERAR TOKEN Y INSERTAR EN BD
    // ============================================================
    const token = crypto.randomUUID();
    const expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await poolPromise.query(
      `INSERT INTO recovery_links (id_usuario, token, expiracion) 
       VALUES (?, ?, ?)`,
      [usuario.id_usuario, token, expiracion]
    );

    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    // ============================================================
    // 4) ENVIAR CORREO
    // ============================================================
    const mailOptions = {
      from: `"Instituto de Estudios Superiores Tiozihuatl" <${process.env.SMTP_USER}>`,
      to: correo,
      subject: "🔐 Recuperación de contraseña - Enlace seguro",
      html: `
        <p>Hola <strong>${usuario.nombre}</strong>,</p>
        <p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>

        <p>
          <a href="${link}" 
             style="background:#2563eb;color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">
             Restablecer contraseña
          </a>
        </p>

        <p>Si el botón no funciona, copia y pega este enlace:</p>
        <p>${link}</p>

        <p><strong>Este enlace expira en 15 minutos.</strong></p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    return { message: mensajeGeneral };
  },


  /**
   * ================================================================
   * VALIDAR TOKEN
   * ================================================================
   */
  async validateRecoveryToken(token) {
    const [rows] = await poolPromise.query(
      `SELECT id_usuario
       FROM recovery_links
       WHERE token = ?
       AND expiracion > NOW()
       LIMIT 1`,
      [token]
    );

    return { valid: rows.length > 0 };
  },


  /**
   * ================================================================
   * RESTABLECER CONTRASEÑA POR TOKEN
   * ================================================================
   */
  async resetPasswordByToken(token, nuevaContrasena) {

    const [rows] = await poolPromise.query(
      `SELECT id_usuario
       FROM recovery_links
       WHERE token = ?
       AND expiracion > NOW()
       LIMIT 1`,
      [token]
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
