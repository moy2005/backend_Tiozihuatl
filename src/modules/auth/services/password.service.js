import crypto from "crypto";
import bcrypt from "bcryptjs";
import { transporter } from "../../../config/email.config.js";
import { poolPromise } from "../../../config/db.config.js";
import { RecoveryModel } from "../models/recovery.model.js";

export const PasswordService = {
async sendRecoveryEmail(correo) {

    // ============================================================
    // 0) LIMITACIÓN DE INTENTOS (5 minutos por solicitud)
    // ============================================================

    // Buscar el último intento
    const [intentos] = await poolPromise.query(
      `SELECT fecha FROM recovery_requests 
       WHERE correo = ?
       ORDER BY fecha DESC 
       LIMIT 1`,
      [correo]
    );

    if (intentos.length > 0) {
      const ultimaFecha = new Date(intentos[0].fecha);
      const ahora = new Date();
      const diffMin = (ahora - ultimaFecha) / 1000 / 60;

      // ❌ Bloqueo si fue hace menos de 5 minutos
      if (diffMin < 5) {
        return {
          message:
            "Ya solicitaste un código recientemente. Intenta nuevamente en unos minutos."
        };
      }
    }

    // Registrar el intento actual
    await poolPromise.query(
      "INSERT INTO recovery_requests (correo) VALUES (?)",
      [correo]
    );

    // ============================================================
    // 1) BUSCAR USUARIO (pero sin revelar información)
    // ============================================================
    const [rows] = await poolPromise.query(
      "SELECT id_usuario, nombre, estado FROM usuarios WHERE correo = ? LIMIT 1",
      [correo]
    );

    // 🔒 No revelar si el usuario existe o no
    const mensajeGeneral =
      "Si el correo está registrado, se envió un código de verificación.";

    if (rows.length === 0) return { message: mensajeGeneral };

    const user = rows[0];

    if (user.estado !== "Activo")
      return { message: mensajeGeneral };

    const { id_usuario, nombre } = user;

    // ============================================================
    // 2) GENERAR CÓDIGO Y ENVIARLO
    // ============================================================
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracion = new Date(Date.now() + 15 * 60 * 1000);

    await RecoveryModel.create({ id_usuario, codigo, expiracion });

   // HTML con diseño ultra moderno y profesional
const mailOptions = {
  from: `"Instituto de Estudios Superiores Tiozihuatl" <${process.env.SMTP_USER}>`,
  to: correo,
  subject: "🔐 Recuperación de contraseña - Código de verificación",
  html: `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperación de Contraseña</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .email-wrapper {
          padding: 40px 20px;
          min-height: 100vh;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%);
          position: relative;
          padding: 60px 40px;
          text-align: center;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 15s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(180deg); }
        }
        .header-content {
          position: relative;
          z-index: 1;
        }
        .logo-container {
          display: inline-block;
          margin-bottom: 20px;
          position: relative;
        }
        .logo-container::before {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background: linear-gradient(45deg, #3b82f6, #60a5fa, #93c5fd, #3b82f6);
          border-radius: 50%;
          opacity: 0.3;
          animation: rotate 3s linear infinite;
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .header img {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          position: relative;
          z-index: 1;
          background: #ffffff;
          padding: 5px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        .header p {
          margin: 8px 0 0;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 400;
        }
        .content {
          padding: 50px 40px;
          background: #ffffff;
        }
        .greeting {
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .greeting strong {
          color: #2563eb;
        }
        .content p {
          line-height: 1.7;
          margin: 0 0 20px;
          color: #4b5563;
          font-size: 15px;
        }
        .code-section {
          margin: 40px 0;
          text-align: center;
        }
        .code-label {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .code-box {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 2px solid #3b82f6;
          border-radius: 16px;
          padding: 30px;
          display: inline-block;
          position: relative;
          box-shadow: 0 10px 40px rgba(59, 130, 246, 0.15);
        }
        .code-box::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, #3b82f6, #60a5fa, #93c5fd, #3b82f6);
          border-radius: 16px;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: -1;
        }
        .code {
          font-size: 48px;
          letter-spacing: 12px;
          font-weight: 900;
          color: #1e40af;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Courier New', monospace;
          text-shadow: 0 2px 4px rgba(30, 64, 175, 0.1);
        }
        .alert-box {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-left: 4px solid #f59e0b;
          padding: 20px 24px;
          border-radius: 12px;
          margin: 30px 0;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);
        }
        .alert-box p {
          margin: 0;
          color: #92400e;
          font-size: 14px;
          line-height: 1.6;
        }
        .alert-box strong {
          color: #78350f;
          font-weight: 700;
        }
        .alert-icon {
          font-size: 20px;
          margin-right: 8px;
          vertical-align: middle;
        }
        .security-note {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 12px;
          margin-top: 30px;
          border: 1px solid #e5e7eb;
        }
        .security-note p {
          margin: 0;
          color: #374151;
          font-size: 14px;
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);
          margin: 40px 0;
        }
        .footer {
          background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
          padding: 40px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-logo {
          margin-bottom: 16px;
          opacity: 0.6;
        }
        .footer p {
          margin: 8px 0;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.6;
        }
        .footer-links {
          margin-top: 20px;
        }
        .footer-links a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
          padding: 10px 24px;
          background: #eff6ff;
          border-radius: 8px;
          display: inline-block;
          transition: all 0.3s ease;
          font-size: 14px;
        }
        .social-links {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }
        .social-links p {
          font-size: 12px;
          color: #9ca3af;
        }
        
        @media (max-width: 600px) {
          .email-wrapper {
            padding: 20px 10px;
          }
          .container {
            border-radius: 16px;
          }
          .header {
            padding: 40px 24px;
          }
          .header h1 {
            font-size: 22px;
          }
          .content {
            padding: 32px 24px;
          }
          .code {
            font-size: 36px;
            letter-spacing: 8px;
          }
          .code-box {
            padding: 24px 20px;
          }
          .footer {
            padding: 32px 24px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <div class="header-content">
              <div class="logo-container">
                <img src="https://res.cloudinary.com/dazzy4wzq/image/upload/v1761524498/logo1_nxe85q.png" alt="Instituto Tiozihuatl">
              </div>
              <h1>Recuperación de Contraseña</h1>
              <p>Solicitud de restablecimiento</p>
            </div>
          </div>
          
          <div class="content">
            <p class="greeting">Hola <strong>${nombre}</strong>,</p>
            
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Para continuar con el proceso de recuperación, utiliza el siguiente código de verificación:</p>

            <div class="code-section">
              <div class="code-label">Tu código de verificación</div>
              <div class="code-box">
                <div class="code">${codigo}</div>
              </div>
            </div>

            <div class="alert-box">
              <p>
                <span class="alert-icon">⏱️</span>
                <strong>Importante:</strong> Este código expira en <strong>15 minutos</strong>. Por tu seguridad, no compartas este código con nadie.
              </p>
            </div>

            <div class="divider"></div>

            <div class="security-note">
              <p>
                <strong>🔒 Nota de seguridad:</strong> Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu cuenta permanecerá protegida y no se realizará ningún cambio.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-logo">
              <p><strong>Instituto de Estudios Superiores Tiozihuatl</strong></p>
            </div>
            <p>© ${new Date().getFullYear()} Todos los derechos reservados</p>
            <div class="footer-links">
              <a href="https://frontiozihuatl.netlify.app/">Visitar Portal Institucional</a>
            </div>
            <div class="social-links">
              <p>Este es un correo automático, por favor no responder.</p>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
};

    await transporter.sendMail(mailOptions);

    return { message: mensajeGeneral };
},


  /**
   * ================================================================
   * RESTABLECER CONTRASEÑA
   * ================================================================
   */
  async resetPassword(codigo, nuevaContrasena) {
    const [rows] = await poolPromise.query(
      `SELECT R.id_usuario, U.nombre
       FROM recuperacion R
       INNER JOIN usuarios U ON R.id_usuario = U.id_usuario
       WHERE R.codigo = ? AND R.fecha_expiracion > NOW()
       ORDER BY R.fecha_emision DESC
       LIMIT 1`,
      [codigo]
    );

    if (rows.length === 0)
      throw new Error("El código es inválido o ha expirado.");

    const id_usuario = rows[0].id_usuario;

    // Encriptar nueva contraseña
    const contrasenaHash = await bcrypt.hash(nuevaContrasena, 12);

    // Actualizar contraseña
    await poolPromise.query(
      "UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?",
      [contrasenaHash, id_usuario]
    );

    // Eliminar el código usado
    await poolPromise.query(
      "DELETE FROM recuperacion WHERE codigo = ?",
      [codigo]
    );

    return { message: "Contraseña actualizada correctamente." };
  },
};
