import { JWTService } from '../services/jwt.service.js';

/**
 * Middleware para verificar el token JWT en rutas protegidas
 */
export const verifyAuth = (req, res, next) => {
  // Espera el formato: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const decoded = JWTService.verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }

  // Almacena la info del usuario decodificada para usar en la ruta
  req.user = decoded;
  next();
};

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "Token no proporcionado" });

    const token = authHeader.split(" ")[1];
    const decoded = JWTService.verifyToken(token);

    if (!decoded)
      return res.status(403).json({ error: "Token inválido o expirado" });

    // Guarda los datos del usuario en la solicitud
    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ Error en authMiddleware:", error.message);
    res.status(401).json({ error: "No autorizado" });
  }
};
