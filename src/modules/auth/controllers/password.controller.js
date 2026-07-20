import { PasswordService } from "../services/password.service.js";

export const PasswordController = {

  /**
   * ============================================================
   * 1) Enviar enlace de recuperación (correo + palabra secreta)
   * ============================================================
   */
async forgotPassword(req, res) {
  try {
    const { correo, palabra_secreta } = req.body;

    if (!correo || !palabra_secreta) {
      return res.status(400).json({
        error: "Correo y palabra secreta son obligatorios"
      });
    }

    const result = await PasswordService.sendRecoveryEmail(
      correo,
      palabra_secreta
    );

    if (result.serviceUnavailable) {
      return res.status(503).json({ error: result.message });
    }

    if (result.error) {
      return res.status(200).json(result); // palabra secreta incorrecta
    }

    return res.status(200).json({
      message: result.message
    });

  } catch (error) {
    console.error("Error en forgotPassword:", error);
    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
},


  /**
   * ============================================================
   * 2) Validar token (cuando usuario abre el enlace del correo)
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

      if (!token || !nuevaContrasena) {
        return res.status(400).json({
          error: "Datos incompletos"
        });
      }

      const result = await PasswordService.resetPasswordByToken(
        token,
        nuevaContrasena
      );

      return res.status(200).json(result);

    } catch (error) {
      return res.status(400).json({
        error: error.message
      });
    }
  },

};
