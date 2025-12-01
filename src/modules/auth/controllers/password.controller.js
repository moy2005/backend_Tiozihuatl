import { PasswordService } from "../services/password.service.js";

export const PasswordController = {

  /**
   * ============================================================
   * 1) Enviar enlace de recuperación
   * ============================================================
   */
  async forgotPassword(req, res) {
    try {
      const { correo } = req.body;

      if (!correo)
        return res.status(400).json({ error: "Correo requerido" });

      const result = await PasswordService.sendRecoveryEmail(correo);

      // Siempre 200 para no revelar información
      return res.status(200).json({
        message: result.message
      });

    } catch (error) {
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  },


  /**
   * ============================================================
   * 2) Validar token (cuando usuario abre enlace del correo)
   * ============================================================
   */
  async validateToken(req, res) {
    try {
      const { token } = req.query;

      if (!token)
        return res.status(400).json({ error: "Token requerido" });

      const result = await PasswordService.validateRecoveryToken(token);

      return res.status(200).json(result);

    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },


  /**
   * ============================================================
   * 3) Restablecer contraseña con token válido
   * ============================================================
   */
  async resetPassword(req, res) {
    try {
      const { token, nuevaContrasena } = req.body;

      if (!token || !nuevaContrasena)
        return res.status(400).json({ error: "Datos incompletos" });

      const result = await PasswordService.resetPasswordByToken(
        token,
        nuevaContrasena
      );

      return res.status(200).json(result);

    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

};
