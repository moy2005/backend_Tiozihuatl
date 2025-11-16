import nodemailer from "nodemailer";

/**
 * Servicio para enviar correos SMTP
 */
export const sendMail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,        // smtp.gmail.com
      port: process.env.SMTP_PORT,        // 465
      secure: true,                       // Gmail requiere SSL en puerto 465
      auth: {
        user: process.env.SMTP_USER,      // tu correo
        pass: process.env.SMTP_PASS,      // contraseña de app (NO la normal)
      },
    });

    const info = await transporter.sendMail({
      from: `"Instituto de Estudios Superiores Tiozihuatl" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("📧 Email enviado:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("❌ Error enviando correo:", err);
    return { success: false, error: err.message };
  }
};
