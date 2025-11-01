export const validateUserFields = (req, res, next) => {
  const method = req.method.toUpperCase(); // Detecta si es POST o PUT
  const { nombre, a_paterno, correo, telefono } = req.body;

  // ================================================================
  // 🔹 VALIDACIÓN PARA CREAR USUARIO (POST)
  // ================================================================
  if (method === "POST") {
    if (!nombre || !a_paterno || !correo) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res
        .status(400)
        .json({ error: "Correo electrónico no válido" });
    }

    // Validar formato de teléfono (opcional)
    if (telefono && !/^[0-9]{8,15}$/.test(telefono)) {
      return res.status(400).json({ error: "Teléfono no válido" });
    }
  }

  // ================================================================
  // 🔹 VALIDACIÓN PARA ACTUALIZAR USUARIO (PUT)
  // ================================================================
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
      "matricula",
      "estado",
      "contrasena",
    ];

    const camposPresentes = Object.keys(req.body).filter(
      (campo) =>
        camposPermitidos.includes(campo) &&
        req.body[campo] !== undefined &&
        req.body[campo] !== null
    );

    if (camposPresentes.length === 0) {
      return res
        .status(400)
        .json({ error: "Faltan campos válidos para actualizar" });
    }

    // Si viene correo, valida formato
    if (req.body.correo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.correo)) {
        return res
          .status(400)
          .json({ error: "Correo electrónico no válido" });
      }
    }

    // Si viene teléfono, valida formato
    if (req.body.telefono && !/^[0-9]{8,15}$/.test(req.body.telefono)) {
      return res.status(400).json({ error: "Teléfono no válido" });
    }
  }

  next();
};
