import crypto from "crypto";
import { poolPromise } from "../../../config/db.config.js";
import { JWTService } from "../../../core/services/jwt.service.js";
import { RefreshModel } from "../models/refresh.model.js";
import { SessionModel } from "../models/session.model.js";

export const OAuthController = {
  success: async (req, res) => {
    try {
      const user = req.user;

      if (!user || !user.id_usuario) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=invalid_user`
        );
      }

      const [rows] = await poolPromise.query(
        `SELECT U.id_usuario, U.nombre, U.correo, R.nombre_rol
         FROM usuarios U
         INNER JOIN roles R ON U.id_rol = R.id_rol
         WHERE U.id_usuario = ?
         LIMIT 1`,
        [user.id_usuario]
      );

      if (!rows.length) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=invalid_user`
        );
      }

      const sessionUser = rows[0];
      const accessToken = JWTService.generateAccessToken({
        id: sessionUser.id_usuario,
        id_usuario: sessionUser.id_usuario,
        correo: sessionUser.correo,
        rol: sessionUser.nombre_rol,
      });
      const refreshToken = crypto.randomUUID();

      await SessionModel.save(sessionUser.id_usuario, accessToken, req.ip);
      await RefreshModel.save(sessionUser.id_usuario, refreshToken, 7);

      const redirectUrl = new URL(`${process.env.FRONTEND_URL}/login`);
      redirectUrl.searchParams.set("accessToken", accessToken);
      redirectUrl.searchParams.set("refreshToken", refreshToken);
      redirectUrl.searchParams.set("id", String(sessionUser.id_usuario));
      redirectUrl.searchParams.set("rol", sessionUser.nombre_rol || "");
      redirectUrl.searchParams.set("nombre", sessionUser.nombre || "");
      redirectUrl.searchParams.set("correo", sessionUser.correo || "");

      return res.redirect(redirectUrl.toString());
    } catch (err) {
      console.error("Error en OAuth success:", err.message);
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed`
      );
    }
  },

  failure: (req, res) => {
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=auth_cancelled`
    );
  },
};
