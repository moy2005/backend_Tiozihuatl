const LOGO_URL =
  "https://res.cloudinary.com/dazzy4wzq/image/upload/c_limit,w_128,q_auto:eco,f_png/v1772194846/BackgroundEraser_20260227_061627842_khnhzp.png";

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const accountIcon = (type) => {
  if (type === "recovery") {
    return `
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" stroke="#1976D2" stroke-width="1.8"/>
        <path d="M8 10V7.5C8 5.57 9.79 4 12 4C14.21 4 16 5.57 16 7.5V10" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M12 14V16.5" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;
  }

  return `
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#1976D2" stroke-width="1.8"/>
      <path d="M4.5 7L12 12.5L19.5 7" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15.5 16L17 17.5L20 14.5" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
};

const clockIcon = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke="#1976D2" stroke-width="1.8"/>
    <path d="M12 8V12L14.5 14" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

const renderAuthEmail = ({
  type,
  preview,
  eyebrow,
  title,
  recipientName,
  description,
  buttonText,
  actionUrl,
  expirationText,
  securityText,
}) => {
  const safeName = escapeHtml(recipientName);
  const safeUrl = escapeHtml(actionUrl);

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(title)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { padding: 20px 12px !important; }
        .email-content { padding: 30px 22px !important; }
        .email-header { padding: 22px !important; }
        .email-title { font-size: 26px !important; }
        .email-button { display: block !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#E3F2FD;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1E293B;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#E3F2FD;">
      <tr>
        <td class="email-shell" align="center" style="padding:42px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #BBDEFB;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(30,41,59,0.08);">
            <tr>
              <td style="height:6px;background:#03A9F4;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td class="email-header" style="padding:24px 34px;border-bottom:1px solid #E3F2FD;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="76" valign="middle">
                      <img src="${LOGO_URL}" width="64" alt="Instituto Tiozihuatl" style="display:block;width:64px;height:auto;border:0;">
                    </td>
                    <td valign="middle" style="font-size:14px;line-height:20px;font-weight:700;color:#2C3A6A;">
                      Instituto de Estudios Superiores<br>Tiozihuatl
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-content" style="padding:40px 42px 38px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" valign="middle" width="58" height="58" style="width:58px;height:58px;background:#E3F2FD;border:1px solid #BBDEFB;border-radius:12px;">
                      ${accountIcon(type)}
                    </td>
                  </tr>
                </table>

                <p style="margin:22px 0 8px;color:#1976D2;font-size:12px;line-height:18px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 class="email-title" style="margin:0;color:#1E293B;font-size:30px;line-height:38px;font-weight:750;letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
                <p style="margin:22px 0 0;color:#1E293B;font-size:16px;line-height:25px;">Hola${safeName ? `, <strong>${safeName}</strong>` : ""}.</p>
                <p style="margin:10px 0 0;color:#64748B;font-size:16px;line-height:26px;">${escapeHtml(description)}</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                  <tr>
                    <td align="center" bgcolor="#03A9F4" style="background:#03A9F4;border-radius:8px;">
                      <a class="email-button" href="${safeUrl}" target="_blank" style="display:inline-block;width:100%;box-sizing:border-box;padding:15px 24px;color:#FFFFFF;font-size:15px;line-height:20px;font-weight:700;text-align:center;text-decoration:none;border-radius:8px;">${escapeHtml(buttonText)}</a>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;background:#F0F8FF;border:1px solid #BBDEFB;border-radius:10px;">
                  <tr>
                    <td width="48" valign="top" style="padding:16px 0 16px 16px;">${clockIcon}</td>
                    <td valign="middle" style="padding:14px 16px 14px 4px;color:#475569;font-size:14px;line-height:21px;">${escapeHtml(expirationText)}</td>
                  </tr>
                </table>

                ${securityText ? `<p style="margin:20px 0 0;color:#64748B;font-size:14px;line-height:22px;">${escapeHtml(securityText)}</p>` : ""}

                <p style="margin:24px 0 7px;color:#64748B;font-size:12px;line-height:18px;">Si el botón no funciona, copia este enlace:</p>
                <p style="margin:0;word-break:break-all;color:#1976D2;font-size:12px;line-height:19px;"><a href="${safeUrl}" target="_blank" style="color:#1976D2;text-decoration:underline;">${safeUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 34px;background:#F8FAFC;border-top:1px solid #E2E8F0;color:#64748B;font-size:12px;line-height:18px;text-align:center;">
                Mensaje automático del Instituto de Estudios Superiores Tiozihuatl.<br>No respondas a este correo.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const buildVerificationEmail = ({ name, actionUrl }) =>
  renderAuthEmail({
    type: "verification",
    preview: "Confirma tu correo para continuar con tu registro como visitante.",
    eyebrow: "Registro de visitante",
    title: "Confirma tu correo",
    recipientName: name,
    description:
      "Verifica esta dirección para continuar con la creación de tu cuenta de visitante.",
    buttonText: "Verificar correo",
    actionUrl,
    expirationText: "Este enlace estará disponible durante 1 hora.",
  });

export const buildPasswordRecoveryEmail = ({ name, actionUrl }) =>
  renderAuthEmail({
    type: "recovery",
    preview: "Usa el enlace seguro para restablecer la contraseña de tu cuenta.",
    eyebrow: "Seguridad de la cuenta",
    title: "Restablece tu contraseña",
    recipientName: name,
    description:
      "Recibimos una solicitud para cambiar la contraseña de tu cuenta.",
    buttonText: "Restablecer contraseña",
    actionUrl,
    expirationText: "Por seguridad, este enlace estará disponible durante 15 minutos.",
    securityText:
      "Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.",
  });
