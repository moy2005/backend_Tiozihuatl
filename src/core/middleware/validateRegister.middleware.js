export const validateRegisterData = (req, res, next) => {
  const { nombre, apaterno, amaterno, correo, telefono, contrasena, palabra_secreta } = req.body;

  // ==============================
  // Validación de nombre y apellidos
  // ==============================
  const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,30}$/;

  if (nombre && !nameRegex.test(nombre))
    return res.status(400).json({ error: "Nombre inválido. Solo letras y espacios." });

  if (apaterno && !nameRegex.test(apaterno))
    return res.status(400).json({ error: "Apellido paterno inválido." });

  if (amaterno && !nameRegex.test(amaterno))
    return res.status(400).json({ error: "Apellido materno inválido." });

  // ==============================
  // Validación de correo
  // ==============================
  if (correo) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) 
      return res.status(400).json({ error: "Correo electrónico inválido." });
  }

  // ==============================
  // Validación de teléfono
  // ==============================
  if (telefono) {
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(telefono))
      return res.status(400).json({ error: "El teléfono debe tener exactamente 10 dígitos numéricos." });
  }

  // ==============================
  // Validación de palabra secreta
  // ==============================
  if (palabra_secreta) {
    if (palabra_secreta.length < 4 || palabra_secreta.length > 30)
      return res.status(400).json({ error: "La palabra secreta debe tener entre 4 y 30 caracteres." });
  }

  next();
};
