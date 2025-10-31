/**
 * Middleware de validación de roles
 * Permite restringir rutas a ciertos roles específicos.
 *
 * @param {Array<string>} rolesPermitidos - Lista de roles que pueden acceder a la ruta
 */
export const roleMiddleware = (rolesPermitidos = []) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.rol) {
        return res.status(401).json({ error: "No autorizado. Token no válido o usuario sin rol." });
      }

      const rolUsuario = req.user.rol;

      // Verifica si el rol del usuario está entre los permitidos
      if (!rolesPermitidos.includes(rolUsuario)) {
        return res.status(403).json({
          error: `Acceso denegado. Rol '${rolUsuario}' no tiene permisos.`,
        });
      }

      // Si pasa la validación, continúa
      next();
    } catch (err) {
      console.error("❌ Error en roleMiddleware:", err.message);
      res.status(500).json({ error: "Error interno al validar rol." });
    }
  };
};

