import xss from "xss";

export const sanitizeXSS = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        
        // Remover espacios al inicio/final
        let text = obj[key].trim();

        // Sanitizar usando xss
        text = xss(text, {
          whiteList: {},       // ❌ No permitir NINGUNA etiqueta HTML
          stripIgnoreTag: true // Quitar tags no permitidos
        });

        // Limpieza adicional de eventos peligrosos
        text = text
          .replace(/on\w+="[^"]*"/gi, "")         // Elimina onclick="..."
          .replace(/<script.*?>.*?<\/script>/gi, "") // Quita scripts completos
          .replace(/javascript:/gi, "")           // Quita javascript:
          .replace(/<.*?>/g, "");                 // Quita cualquier etiqueta restante

        obj[key] = text;
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};
