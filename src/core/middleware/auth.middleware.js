import { JWTService } from '../services/jwt.service.js';

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = JWTService.verifyToken(token);

    if (!decoded) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // 🔐 Estandarizamos estructura del usuario
    req.user = {
      id_usuario: decoded.id,   // 👈 IMPORTANTE
      rol: decoded.rol
    };
    next();

  } catch (error) {
    console.error('❌ Error en authMiddleware:', error.message);

    return res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
  }
};
