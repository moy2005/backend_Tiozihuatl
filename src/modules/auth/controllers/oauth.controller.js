import { JWTService } from "../../../core/services/jwt.service.js";
import { SessionModel } from "../models/session.model.js";
import { RefreshModel } from "../models/refresh.model.js";
import { poolPromise } from "../../../config/db.config.js";
import crypto from "crypto";

export const OAuthController = {
  /**
   * ================================================================
   * ÉXITO EN AUTENTICACIÓN OAUTH (Google / Facebook)
   * ================================================================
   */
  success: async (req, res) => {
    try {
      const user = req.user;

      if (!user || !user.id_usuario) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=invalid_user`
        );
      }

      const accessToken = JWTService.generateToken({
        id: user.id_usuario,
        correo: user.correo,
      });

      const refreshToken = crypto.randomUUID();

      // Guardar sesión y refresh token en MySQL
      await SessionModel.save(user.id_usuario, accessToken, req.ip);
      await RefreshModel.save(user.id_usuario, refreshToken, 7);

      // Construir URL dinámica con datos del usuario
      const redirectUrl = new URL(`${process.env.FRONTEND_URL}/login`);
      redirectUrl.searchParams.set("accessToken", accessToken);
      redirectUrl.searchParams.set("refreshToken", refreshToken);
      redirectUrl.searchParams.set("nombre", user.nombre || "");
      redirectUrl.searchParams.set("correo", user.correo || "");

      return res.redirect(redirectUrl.toString());
    } catch (err) {
      console.error("Error en OAuth success:", err.message);
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed`
      );
    }
  },

  /**
   * ================================================================
   * FALLA EN AUTENTICACIÓN OAUTH
   * ================================================================
   */
  failure: (req, res) => {
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=auth_cancelled`
    );
  },
};
