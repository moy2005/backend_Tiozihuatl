import { JWTService } from '../services/jwt.service.js';
import { RefreshModel } from '../../modules/auth/models/refresh.model.js';

const buildRequestUser = (decoded) => ({
  id: decoded.id || decoded.id_usuario,
  id_usuario: decoded.id || decoded.id_usuario,
  rol: decoded.rol,
  correo: decoded.correo,
});

const touchRefreshActivity = async (userId) => {
  try {
    await RefreshModel.touchActivity(userId);
  } catch (error) {
    console.warn('No se pudo actualizar la actividad de la sesion:', error.message);
  }
};

export const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const decoded = JWTService.verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Token invalido o expirado' });
  }

  req.user = buildRequestUser(decoded);
  await touchRefreshActivity(req.user.id_usuario);
  next();
};

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = JWTService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Token invalido o expirado' });
    }

    req.user = buildRequestUser(decoded);
    await touchRefreshActivity(req.user.id_usuario);
    next();
  } catch (error) {
    console.error('Error en authMiddleware:', error.message);
    res.status(401).json({ error: 'No autorizado' });
  }
};
