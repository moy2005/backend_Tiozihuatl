import { PasswordService } from "../services/password.service.js";

export const PasswordController = {
  async forgotPassword(req, res) {
    try {
      const { correo } = req.body;
      if (!correo) return res.status(400).json({ error: "Correo requerido" });
      const result = await PasswordService.sendRecoveryEmail(correo);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async resetPassword(req, res) {
    try {
      const { codigo, nuevaContrasena } = req.body;
      if (!codigo || !nuevaContrasena)
        return res.status(400).json({ error: "Datos incompletos" });

      const result = await PasswordService.resetPassword(codigo, nuevaContrasena);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};
