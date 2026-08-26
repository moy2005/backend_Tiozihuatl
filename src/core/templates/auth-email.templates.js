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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" stroke="#1976D2" stroke-width="1.8"/>
        <path d="M8 10V7.5C8 5.57 9.79 4 12 4C14.21 4 16 5.57 16 7.5V10" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M12 14V16.5" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;
  }

  return `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#1976D2" stroke-width="1.8"/>
      <path d="M4.5 7L12 12.5L19.5 7" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15.5 16L17 17.5L20 14.5" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
};

const clockIcon = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke="#1976D2" stroke-width="1.8"/>
    <path d="M12 8V12L14.5 14" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

const shieldIcon = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 3.5L19 6.2V11C19 15.4 16.1 18.9 12 20.5C7.9 18.9 5 15.4 5 11V6.2L12 3.5Z" stroke="#1976D2" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M9.3 11.6L11.1 13.4L14.8 9.7" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

const linkIcon = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M9 15L15 9" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M11 6.5H8.5C6 6.5 4 8.5 4 11S6 15.5 8.5 15.5H10" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M13 17.5H15.5C18 17.5 20 15.5 20 13S18 8.5 15.5 8.5H14" stroke="#1976D2" stroke-width="1.8" stroke-linecap="round"/>
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
        .email-shell { padding: 14px 8px !important; }
        .email-content { padding: 30px 22px !important; }
        .email-title { font-size: 22px !important; line-height: 30px !important; }
        .email-button { display: block !important; width: 100% !important; }
        .brand-name { font-size: 13px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1E293B;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#F1F5F9;">
      <tr>
        <td class="email-shell" align="center" style="padding:44px 18px;">

          <!-- Brand mark, centered above the card -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:22px;">
            <tr>
              <td align="center">
                <img src="${LOGO_URL}" width="46" alt="Instituto Tiozihuatl" style="display:block;width:46px;height:auto;border:0;">
              </td>
            </tr>
            <tr>
              <td align="center" class="brand-name" style="padding-top:10px;font-size:14px;line-height:20px;font-weight:700;color:#0F1B33;">
                Instituto de Estudios Superiores Tiozihuatl
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#FFFFFF;border:1px solid #DBE4EC;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="height:4px;line-height:4px;font-size:0;background:#1976D2;">&nbsp;</td>
            </tr>
            <tr>
              <td class="email-content" style="padding:40px 40px 36px;">

                <!-- Icon + badge, centered as a small header -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" valign="middle" width="52" height="52" style="width:52px;height:52px;background:#EAF2FB;border-radius:12px;">
                            ${accountIcon(type)}
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:14px auto 0;">
                        <tr>
                          <td style="background:#EAF2FB;border-radius:4px;padding:5px 12px;">
                            <span style="color:#1976D2;font-size:11px;line-height:15px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(eyebrow)}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <h1 class="email-title" align="center" style="margin:18px 0 0;color:#0F1B33;font-size:25px;line-height:32px;font-weight:700;letter-spacing:-0.01em;text-align:center;">${escapeHtml(title)}</h1>

                <!-- Body copy, left-aligned for readability -->
                <p style="margin:22px 0 0;color:#1E293B;font-size:16px;line-height:25px;text-align:left;">Hola${safeName ? `, <strong>${safeName}</strong>` : ""}.</p>
                <p style="margin:8px 0 0;color:#64748B;font-size:15px;line-height:24px;text-align:left;">${escapeHtml(description)}</p>

                <!-- Button, centered -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" bgcolor="#1976D2" style="background:#1976D2;border-radius:6px;">
                            <a class="email-button" href="${safeUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;line-height:20px;font-weight:700;text-align:center;text-decoration:none;border-radius:6px;">${escapeHtml(buttonText)}</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Expiration / security notes, left-aligned rows -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;border-top:1px solid #EEF2F6;">
                  <tr>
                    <td style="padding:16px 0 0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="22" valign="top" style="padding-top:1px;">${clockIcon}</td>
                          <td align="left" style="color:#475569;font-size:13.5px;line-height:20px;">${escapeHtml(expirationText)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ${securityText ? `
                  <tr>
                    <td style="padding:12px 0 0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="22" valign="top" style="padding-top:1px;">${shieldIcon}</td>
                          <td align="left" style="color:#475569;font-size:13.5px;line-height:20px;">${escapeHtml(securityText)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>` : ""}
                </table>

                <!-- Alternate link box, left-aligned -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;background:#F8FAFC;border:1px solid #EEF2F6;border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="22" valign="top" style="padding-top:2px;">${linkIcon}</td>
                          <td align="left">
                            <p style="margin:0 0 4px;color:#94A3B8;font-size:11.5px;line-height:16px;">Si el botón no funciona, copia este enlace:</p>
                            <p style="margin:0;word-break:break-all;font-size:12px;line-height:18px;"><a href="${safeUrl}" target="_blank" style="color:#1976D2;text-decoration:underline;">${safeUrl}</a></p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #EEF2F6;color:#94A3B8;font-size:11.5px;line-height:17px;text-align:center;">
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
    eyebrow: "Registro",
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