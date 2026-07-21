import {
  brevoConfig,
  isEmailConfigured,
} from "../../config/email.config.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeAddress = (recipient) => {
  if (typeof recipient === "string") {
    const email = recipient.trim();
    return email ? { email } : null;
  }

  if (recipient && typeof recipient === "object") {
    const email = String(recipient.email || "").trim();
    const name = String(recipient.name || "").trim();
    return email ? { email, ...(name ? { name } : {}) } : null;
  }

  return null;
};

const normalizeRecipients = (to) => {
  const recipients = (Array.isArray(to) ? to : [to])
    .map(normalizeAddress)
    .filter(Boolean);

  if (
    recipients.length === 0 ||
    recipients.some(({ email }) => !EMAIL_PATTERN.test(email))
  ) {
    throw new Error("La direccion de correo destinataria no es valida.");
  }

  return recipients;
};

const normalizeBrevoError = (status, responseBody) => {
  const providerMessage = String(responseBody?.message || "").trim();

  if (status === 401) {
    return "Brevo rechazo la API key configurada.";
  }

  if (status === 400 && /sender|from/i.test(providerMessage)) {
    return "El remitente configurado no esta verificado en Brevo.";
  }

  if (status === 429) {
    return "Brevo alcanzo temporalmente el limite de envios.";
  }

  return providerMessage || "Brevo no pudo procesar el correo.";
};

const readResponseBody = async (response) => {
  const rawBody = await response.text();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    return { message: rawBody };
  }
};

/**
 * Envia un correo transaccional mediante la API HTTP de Brevo.
 * Mantiene una interfaz unica para registro, recuperacion y futuros modulos.
 */
export const sendMail = async ({
  to,
  subject,
  html,
  text,
  sender = brevoConfig.sender,
  replyTo = brevoConfig.replyTo,
  tags,
}) => {
  if (!isEmailConfigured) {
    return {
      success: false,
      error: "El proveedor de correo no esta configurado.",
      code: "EMAIL_NOT_CONFIGURED",
    };
  }

  if (!subject || (!html && !text)) {
    return {
      success: false,
      error: "El correo requiere asunto y contenido.",
      code: "INVALID_EMAIL_PAYLOAD",
    };
  }

  try {
    const payload = {
      sender: normalizeAddress(sender),
      to: normalizeRecipients(to),
      subject: String(subject),
      ...(html ? { htmlContent: String(html) } : {}),
      ...(text ? { textContent: String(text) } : {}),
      ...(replyTo ? { replyTo: normalizeAddress(replyTo) } : {}),
      ...(Array.isArray(tags) && tags.length ? { tags } : {}),
    };

    if (!payload.sender || !EMAIL_PATTERN.test(payload.sender.email)) {
      return {
        success: false,
        error: "El remitente configurado para Brevo no es valido.",
        code: "INVALID_EMAIL_SENDER",
      };
    }

    const response = await fetch(brevoConfig.apiUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": brevoConfig.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      const error = normalizeBrevoError(response.status, responseBody);
      console.error("Error enviando correo con Brevo:", {
        status: response.status,
        code: responseBody?.code,
        message: responseBody?.message,
      });
      return {
        success: false,
        error,
        code: responseBody?.code || `BREVO_HTTP_${response.status}`,
      };
    }

    console.log(
      `Correo aceptado por Brevo: ${responseBody?.messageId || "sin-id"}`
    );

    return {
      success: true,
      id: responseBody?.messageId || null,
      provider: "brevo",
    };
  } catch (error) {
    console.error("Error comunicando con Brevo:", error?.message);

    return {
      success: false,
      error: "No fue posible conectar con Brevo.",
      code: "BREVO_CONNECTION_ERROR",
    };
  }
};
