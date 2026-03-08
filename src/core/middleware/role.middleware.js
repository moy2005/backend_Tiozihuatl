/**
 * Middleware de validación de roles
 * Permite restringir rutas a ciertos roles específicos.
 *
 * @param {Array<string>} rolesPermitidos - Lista de roles que pueden acceder a la ruta
 */
export const roleMiddleware = (rolesPermitidos = []) => {

  return (req, res, next) => {
    try {

      console.log('🔍 req.user completo:', req.user);
      console.log('🔍 Roles permitidos:', rolesPermitidos);
      if (!req.user || !req.user.rol) {
        return res.status(401).json({ error: "No autorizado. Token no válido o usuario sin rol." });
      }

      const rolUsuario = req.user.rol;

      if (!rolUsuario) {
        return res.status(403).json({
          error: 'Usuario sin rol asignado'
        });
      }

      // 🔎 Validación exacta de rol
      if (!rolesPermitidos.includes(rolUsuario)) {
        return res.status(403).json({
          error: `Acceso denegado. Rol '${rolUsuario}' no autorizado`
        });
      }

      next();

    } catch (error) {
      console.error('❌ Error en roleMiddleware:', error.message);

      return res.status(500).json({
        error: 'Error interno validando rol'
      });
    }
  };
};

