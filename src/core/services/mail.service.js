import { emailFrom, emailReplyTo, resend } from "../../config/email.config.js";

const normalizeEmailError = (error) => {
  const rawMessage = String(error?.message || "").trim();

  if (!rawMessage) {
    return "No se pudo enviar el correo en este momento.";
  }

  if (rawMessage.includes("You can only send testing emails to your own email address")) {
    return "Resend aun esta en modo de prueba. Solo puede enviar correos a la direccion propietaria de la cuenta hasta que verifiques un dominio propio.";
  }

  if (rawMessage.includes("domain is not verified")) {
    return "El dominio configurado para enviar correos aun no esta verificado en Resend.";
  }

  return rawMessage;
};

/**
 * Servicio para enviar correos por Resend
 */
export const sendMail = async ({ to, subject, html, from = emailFrom }) => {
  try {
    if (!resend) {
      return {
        success: false,
        error: "El proveedor de correo no esta configurado.",
      };
    }

    const payload = {
      from,
      to,
      subject,
      html,
    };

    if (emailReplyTo) {
      payload.replyTo = emailReplyTo;
    }

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error("Error enviando correo con Resend:", error);
      return {
        success: false,
        error: normalizeEmailError(error),
      };
    }

    console.log("Email enviado con Resend:", data?.id || "sin-id");
    return {
      success: true,
      id: data?.id || null,
    };
  } catch (err) {
    console.error("Error enviando correo con Resend:", err);
    return {
      success: false,
      error: normalizeEmailError(err),
    };
  }
};
