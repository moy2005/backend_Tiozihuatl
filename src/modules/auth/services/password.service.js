import crypto from "crypto";
import bcrypt from "bcryptjs";
import { transporter } from "../../../config/email.config.js";
import { poolPromise } from "../../../config/db.config.js";
import { RecoveryModel } from "../models/recovery.model.js";

export const PasswordService = {
  /**
   * ================================================================
   * ENVÍO DE CÓDIGO DE RECUPERACIÓN
   * ================================================================
   */
  async sendRecoveryEmail(correo) {
    const [rows] = await poolPromise.query(
      "SELECT id_usuario, nombre, estado FROM usuarios WHERE correo = ? LIMIT 1",
      [correo]
    );

    if (rows.length === 0)
      throw new Error("El correo no está registrado en el sistema.");

    const user = rows[0];
    if (user.estado !== "Activo")
      throw new Error("La cuenta está inactiva o bloqueada.");

    const { id_usuario, nombre } = user;

    // Generar código único de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar código en la BD
    await RecoveryModel.create( { id_usuario, codigo, expiracion });

    // HTML con diseño moderno y profesional
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
            body {
              margin: 0;
              padding: 0;
              background-color: #f3f4f6;
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #374151;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: #fff;
              text-align: center;
              padding: 40px 20px;
            }
            .header img {
              width: 80px;
              border-radius: 50%;
              margin-bottom: 12px;
              box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            .content {
              padding: 40px 30px;
            }
            .content p {
              line-height: 1.6;
              margin: 16px 0;
            }
            .code-box {
              text-align: center;
              margin: 30px 0;
            }
            .code {
              background: linear-gradient(135deg, #dbeafe, #eff6ff);
              border-radius: 12px;
              display: inline-block;
              padding: 20px 40px;
              font-size: 40px;
              letter-spacing: 8px;
              font-weight: 800;
              color: #2563eb;
              font-family: 'Courier New', monospace;
              box-shadow: 0 4px 10px rgba(37, 99, 235, 0.15);
            }
            .alert {
              background-color: #fff7ed;
              color: #9a3412;
              padding: 14px;
              border-radius: 10px;
              font-size: 14px;
              text-align: center;
              margin-top: 20px;
            }
            .footer {
              background: #f9fafb;
              color: #6b7280;
              text-align: center;
              padding: 25px;
              font-size: 13px;
              border-top: 1px solid #e5e7eb;
            }
            .footer a {
              color: #2563eb;
              text-decoration: none;
              font-weight: 600;
            }
            @media (max-width: 600px) {
              .content { padding: 30px 20px; }
              .code { font-size: 32px; letter-spacing: 4px; padding: 15px 30px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://res.cloudinary.com/dazzy4wzq/image/upload/v1761524498/logo1_nxe85q.png" alt="Instituto Tiozihuatl">
              <h1>Recuperación de Contraseña</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${nombre}</strong>,</p>
              <p>Hemos recibido una solicitud para restablecer tu contraseña. Utiliza el siguiente código de verificación:</p>

              <div class="code-box">
                <div class="code">${codigo}</div>
              </div>

              <div class="alert">
                ⏱️ Este código expira en <strong>15 minutos</strong>.  
                No compartas este código con nadie.
              </div>

              <p>Si no solicitaste este cambio, puedes ignorar este correo.  
              Tu cuenta permanecerá protegida.</p>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Instituto de Estudios Superiores Tiozihuatl<br>
              <a href="https://authfront.netlify.app">Visita nuestro portal</a>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    return { message: "Código de verificación enviado correctamente." };
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
      "DELETE FROM recuperacion_contrasena WHERE codigo = ?",
      [codigo]
    );

    return { message: "Contraseña actualizada correctamente." };
  },
};
