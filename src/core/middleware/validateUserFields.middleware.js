export const validateUserFields = (req, res, next) => {
  const { nombre, a_paterno, correo, telefono } = req.body;

  // Validar campos obligatorios
  if (!nombre || !a_paterno || !correo)
    return res.status(400).json({ error: "Faltan campos obligatorios" });

  // Validar formato de correo
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo))
    return res.status(400).json({ error: "Correo electrónico no válido" });

  // Validar formato de teléfono (opcional)
  if (telefono && !/^[0-9]{8,15}$/.test(telefono))
    return res.status(400).json({ error: "Teléfono no válido" });

  next();
};

