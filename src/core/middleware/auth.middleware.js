import { JWTService } from '../services/jwt.service.js';

export const verifyAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const decoded = JWTService.verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }

  req.user = {
    id: decoded.id || decoded.id_usuario,
    rol: decoded.rol
  };
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
      return res.status(401).json({ error: "Token inválido o expirado" });

    req.user = {
      id: decoded.id || decoded.id_usuario, 
      rol: decoded.rol
    };
    next();
  } catch (error) {
    console.error("❌ Error en authMiddleware:", error.message);
    res.status(401).json({ error: "No autorizado" });
  }
};
