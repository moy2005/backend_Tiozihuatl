import dotenv from "dotenv";

dotenv.config();

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "si", "on"].includes(
    String(value).trim().toLowerCase()
  );
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const firstDefinedValue = (...keys) => {
  for (const key of keys) {
    const value = String(process.env[key] || "").trim();
    if (value) return value;
  }

  return "";
};

const senderEmail = firstDefinedValue(
  "BREVO_SENDER_EMAIL",
  "BREVO_FROM_EMAIL",
  "EMAIL_USER"
);

const senderName =
  firstDefinedValue("BREVO_SENDER_NAME", "BREVO_FROM_NAME", "EMAIL_FROM_NAME") ||
  "Instituto de Estudios Superiores Tiozihuatl";

export const brevoConfig = Object.freeze({
  apiKey: String(process.env.BREVO_API_KEY || "").trim(),
  apiUrl:
    String(process.env.BREVO_API_URL || "").trim() ||
    "https://api.brevo.com/v3/smtp/email",
  sender: {
    email: senderEmail,
    name: senderName,
  },
  replyTo: process.env.BREVO_REPLY_TO_EMAIL
    ? {
        email: String(process.env.BREVO_REPLY_TO_EMAIL).trim(),
        name:
          String(process.env.BREVO_REPLY_TO_NAME || "").trim() ||
          "Atencion Tiozihuatl",
      }
    : undefined,
  sandbox: parseBoolean(process.env.BREVO_SANDBOX_MODE, false),
  timeoutMs: parsePositiveInteger(process.env.BREVO_REQUEST_TIMEOUT_MS, 10000),
});

export const isEmailConfigured = Boolean(
  brevoConfig.apiKey && brevoConfig.sender.email
);

if (isEmailConfigured) {
  console.log(
    `Proveedor de correo configurado con Brevo${
      brevoConfig.sandbox ? " (modo sandbox)" : ""
    }`
  );
} else {
  console.warn(
    "Brevo no esta configurado. Define BREVO_API_KEY y un remitente en BREVO_SENDER_EMAIL, BREVO_FROM_EMAIL o EMAIL_USER."
  );
}
