import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const emailFrom =
  process.env.EMAIL_FROM ||
  '"Instituto de Estudios Superiores Tiozihuatl" <onboarding@resend.dev>';

export const emailReplyTo = process.env.EMAIL_REPLY_TO || undefined;

if (resend) {
  console.log("Proveedor de correo configurado con Resend");
} else {
  console.warn("RESEND_API_KEY no configurada. El envio de correos esta deshabilitado.");
}
