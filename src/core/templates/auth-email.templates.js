const INSTITUTE_NAME = "Instituto de Estudios Superiores Tiozihuatl";
const LOGO_URL =
  "https://res.cloudinary.com/dazzy4wzq/image/upload/c_limit,w_128,q_auto:eco,f_png/v1772194846/BackgroundEraser_20260227_061627842_khnhzp.png";
const FONT_STACK = "'Segoe UI', Arial, sans-serif";

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderAuthEmail = ({
  preview,
  title,
  recipientName,
  description,
  buttonText,
  actionUrl,
  expiration,
  securityText,
}) => {
  const safeName = escapeHtml(recipientName);
  const safeUrl = escapeHtml(actionUrl);

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      @media only screen and (max-width: 520px) {
        .email-outer { padding: 16px 10px !important; }
        .email-section { padding-left: 22px !important; padding-right: 22px !important; }
        .email-title { font-size: 28px !important; line-height: 34px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#edf5fb;color:#172f4b;font-family:${FONT_STACK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#edf5fb" style="width:100%;background:#edf5fb;">
      <tr>
        <td class="email-outer" align="center" style="padding:36px 14px;">
          <!--[if mso]><table role="presentation" align="center" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;table-layout:fixed;background:#fff;border:1px solid #cedfed;">
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="78%" height="5" bgcolor="#173a5c" style="height:5px;font-size:1px;line-height:5px;">&nbsp;</td>
                    <td width="22%" height="5" bgcolor="#3fa6e8" style="height:5px;font-size:1px;line-height:5px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-section" style="padding:19px 34px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="52" valign="middle" style="width:52px;">
                      <img src="${LOGO_URL}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border:0;">
                    </td>
                    <td valign="middle" style="color:#173a5c;font-family:${FONT_STACK};font-size:14px;line-height:19px;font-weight:700;">
                      ${INSTITUTE_NAME}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-section" bgcolor="#e1f2ff" style="padding:25px 34px 27px;background:#e1f2ff;border-top:1px solid #cee5f5;">
                <h1 class="email-title" style="margin:0;color:#173a5c;font-family:${FONT_STACK};font-size:34px;line-height:41px;letter-spacing:-0.65px;font-weight:700;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td class="email-section" style="padding:27px 34px 0;color:#172f4b;font-family:${FONT_STACK};font-size:16px;line-height:25px;">
                <p style="margin:0 0 8px;">Hola${safeName ? `, <strong>${safeName}</strong>` : ""}.</p>
                <p style="margin:0;color:#3c5269;">${escapeHtml(description)}</p>
              </td>
            </tr>
            <tr>
              <td class="email-section" style="padding:21px 34px 25px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#174f7d" style="background:#174f7d;border-radius:6px;">
                      <a href="${safeUrl}" style="display:inline-block;border:1px solid #174f7d;border-radius:6px;padding:12px 19px;mso-padding-alt:0;color:#fff;font-family:${FONT_STACK};font-size:15px;line-height:20px;font-weight:700;text-align:center;text-decoration:none;"><!--[if mso]><i style="mso-font-width:145%;mso-text-raise:18pt;" hidden>&ensp;</i><![endif]--><span style="mso-text-raise:9pt;">${escapeHtml(buttonText)}</span><!--[if mso]><i style="mso-font-width:145%;" hidden>&ensp;&#8203;</i><![endif]--></a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-section" style="padding:0 34px 27px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;table-layout:fixed;">
                  <tr>
                    <td bgcolor="#edf6fd" style="padding:12px 14px;background:#edf6fd;color:#234867;font-family:${FONT_STACK};font-size:14px;line-height:21px;">
                      El enlace vence en <strong>${escapeHtml(expiration)}</strong>.
                    </td>
                  </tr>
                  ${securityText ? `<tr>
                    <td style="padding:13px 0 0;color:#3c5269;font-family:${FONT_STACK};font-size:14px;line-height:21px;">
                      ${escapeHtml(securityText)}
                    </td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding:17px 0 0;color:#475e74;font-family:${FONT_STACK};font-size:13px;line-height:20px;">
                      Si el botón no funciona, copia y pega este enlace en tu navegador.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:3px 0 0;font-family:${FONT_STACK};font-size:13px;line-height:19px;word-break:break-all;overflow-wrap:anywhere;">
                      <a href="${safeUrl}" style="color:#174f7d;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">${safeUrl}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-section" bgcolor="#f5f9fc" style="padding:15px 34px;background:#f5f9fc;border-top:1px solid #dce9f2;color:#4c6175;font-family:${FONT_STACK};font-size:12px;line-height:18px;">
                Este correo es automático. No respondas a este mensaje.
              </td>
            </tr>
          </table>
          <!--[if mso]></td></tr></table><![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const buildVerificationEmail = ({ name, actionUrl }) =>
  renderAuthEmail({
    preview: "Confirma tu correo para continuar con tu registro como visitante.",
    title: "Confirma tu correo",
    recipientName: name,
    description: "Verifica esta dirección para continuar con la creación de tu cuenta de visitante.",
    buttonText: "Verificar correo",
    actionUrl,
    expiration: "1 hora",
  });

export const buildPasswordRecoveryEmail = ({ name, actionUrl }) =>
  renderAuthEmail({
    preview: "Usa el enlace para restablecer la contraseña de tu cuenta.",
    title: "Restablece tu contraseña",
    recipientName: name,
    description: "Recibimos una solicitud para cambiar la contraseña de tu cuenta.",
    buttonText: "Restablecer contraseña",
    actionUrl,
    expiration: "15 minutos",
    securityText: "Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.",
  });
