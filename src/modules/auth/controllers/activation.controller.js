import { ActivationService } from "../services/activation.service.js";
import { AdminUserService }  from "../../users/admin/services/admin.user.service.js";

export const ActivationController = {

  /**
   * ================================================================
   * GET /auth/activate-account?token=xxx
   * Verifica si el token es válido antes de mostrar el formulario
   * ================================================================
   */
  async verifyToken(req, res) {
    try {
      const { token } = req.query;
      const result = await ActivationService.verifyToken(token);
      res.status(200).json(result);
    } catch (err) {
      console.error("❌ Error al verificar token:", err.message);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * ================================================================
   * POST /auth/activate-account
   * Activa la cuenta estableciendo la contraseña definitiva
   * ================================================================
   */
  async activateAccount(req, res) {
    try {
      const { token, password, confirm_password } = req.body;
      const result = await ActivationService.activateAccount({
        token,
        password,
        confirm_password,
      });
      res.status(200).json(result);
    } catch (err) {
      console.error("❌ Error al activar cuenta:", err.message);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * ================================================================
   * POST /api/admin/usuarios/regenerar-token/:id
   * Solo administradores — regenera el token de un usuario
   * ================================================================
   */
  async regenerateToken(req, res) {
    try {
      const id_usuario = req.params.id;
      const result     = await ActivationService.regenerateToken(id_usuario);

      // Generar Excel de un solo token para que el admin lo descargue
      const baseUrl     = process.env.FRONTEND_URL;
      //const baseUrl     = "http://localhost:4200";
      const excelBuffer = await AdminUserService.generateTokensExcel(
        [{
          identificador     : result.identificador,
          tipo_identificador: result.tipo_identificador,
          nombre            : `Usuario #${id_usuario}`,
          rol               : "Pendiente",
          activation_token  : result.activation_token,
        }],
        baseUrl
      );

      res.status(200).json({
        message         : result.message,
        tokens_excel_b64: excelBuffer.toString("base64"),
      });

    } catch (err) {
      console.error("❌ Error al regenerar token:", err.message);
      res.status(400).json({ error: err.message });
    }
  },

};
