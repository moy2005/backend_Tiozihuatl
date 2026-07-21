import dotenv from "dotenv";

dotenv.config();

const firstDefinedValue = (...keys) => {
  for (const key of keys) {
    const value = String(process.env[key] || "").trim();
    if (value) return value;
  }

  return "";
};

const senderEmail = firstDefinedValue(
  "BREVO_FROM_EMAIL",
  "EMAIL_USER"
);

const senderName =
  firstDefinedValue("BREVO_FROM_NAME") ||
  "Instituto de Estudios Superiores Tiozihuatl";

export const brevoConfig = Object.freeze({
  apiKey: String(process.env.BREVO_API_KEY || "").trim(),
  apiUrl: "https://api.brevo.com/v3/smtp/email",
  sender: {
    email: senderEmail,
    name: senderName,
  },
});

export const isEmailConfigured = Boolean(
  brevoConfig.apiKey && brevoConfig.sender.email
);

if (isEmailConfigured) {
  console.log("Proveedor de correo configurado con Brevo");
} else {
  console.warn(
    "Brevo no esta configurado. Define BREVO_API_KEY y un remitente en BREVO_FROM_EMAIL o EMAIL_USER."
  );
}
