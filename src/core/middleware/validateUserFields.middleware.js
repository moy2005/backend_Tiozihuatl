const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{8,15}$/;

const hasText = (value) =>
  value !== undefined &&
  value !== null &&
  String(value).trim() !== "";

export const validateUserFields = (req, res, next) => {
  const method = req.method.toUpperCase();
  const { nombre, a_paterno, correo, telefono, id_rol } = req.body;

  if (method === "POST") {
    if (!hasText(nombre) || !hasText(a_paterno) || !hasText(id_rol)) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    if (hasText(correo) && !emailRegex.test(String(correo).trim())) {
      return res.status(400).json({ error: "Correo electrÃ³nico no vÃ¡lido." });
    }

    if (hasText(telefono) && !phoneRegex.test(String(telefono).trim())) {
      return res.status(400).json({ error: "TelÃ©fono no vÃ¡lido." });
    }
  }

  if (method === "PUT") {
    const camposPermitidos = [
      "nombre",
      "a_paterno",
      "a_materno",
      "correo",
      "telefono",
      "id_rol",
      "id_carrera",
      "id_semestre",
      "id_periodo",
      "matricula",
      "grupo",
      "estado",
      "contrasena",
    ];

    const camposPresentes = Object.keys(req.body).filter(
      (campo) => camposPermitidos.includes(campo) && req.body[campo] !== undefined
    );

    if (camposPresentes.length === 0) {
      return res
        .status(400)
        .json({ error: "Faltan campos vÃ¡lidos para actualizar." });
    }

    if (hasText(req.body.correo) && !emailRegex.test(String(req.body.correo).trim())) {
      return res.status(400).json({ error: "Correo electrÃ³nico no vÃ¡lido." });
    }

    if (hasText(req.body.telefono) && !phoneRegex.test(String(req.body.telefono).trim())) {
      return res.status(400).json({ error: "TelÃ©fono no vÃ¡lido." });
    }
  }

  next();
};
