import crypto from "crypto";
import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";
import { JWTService } from "../../../core/services/jwt.service.js";
import { TwilioService } from "../services/sms.service.js";
import { RefreshModel } from "../models/refresh.model.js";
import { SessionModel } from "../models/session.model.js";

export class SMSController {
  static async sendOTP(req, res) {
    try {
      const { telefono } = req.body;

      if (!telefono)
        return res.status(400).json({ error: "Falta el nÃºmero de telÃ©fono." });

      const [rows] = await poolPromise.query(
        "SELECT id_usuario FROM usuarios WHERE telefono = ?",
        [telefono]
      );

      if (rows.length === 0)
        return res.status(404).json({ error: "TelÃ©fono no registrado." });

      const user = rows[0];
      const otp = Math.floor(100000 + Math.random() * 900000);
      const otpHash = await bcrypt.hash(String(otp), 10);
      const fechaExp = new Date(Date.now() + 2 * 60 * 1000);

      await poolPromise.query(
        `INSERT INTO tokens2fa (id_usuario, codigo_otp, tipo, estado, fecha_expiracion)
         VALUES (?, ?, 'SMS', 'Activo', ?)`,
        [user.id_usuario, otpHash, fechaExp]
      );

      const destino = telefono.startsWith("+") ? telefono : `+52${telefono}`;
      const smsResult = await TwilioService.sendSMS(
        destino,
        `Tu cÃ³digo de acceso es: ${otp}`
      );

      if (!smsResult.success)
        return res.status(500).json({ error: "Error al enviar SMS." });

      res.json({
        success: true,
        message: "CÃ³digo OTP enviado correctamente.",
        telefono: destino,
      });
    } catch (error) {
      console.error("Error en sendOTP:", error.message);
      res
        .status(500)
        .json({ error: "Error al enviar SMS.", details: error.message });
    }
  }

  static async verifyOTP(req, res) {
    try {
      const { telefono, otp } = req.body;

      if (!telefono || !otp)
        return res.status(400).json({ error: "Faltan datos." });

      const [users] = await poolPromise.query(
        `SELECT U.*, R.nombre_rol
         FROM usuarios U
         INNER JOIN roles R ON U.id_rol = R.id_rol
         WHERE U.telefono = ?
         LIMIT 1`,
        [telefono]
      );

      if (users.length === 0)
        return res.status(404).json({ error: "TelÃ©fono no registrado." });

      const user = users[0];

      const [tokens] = await poolPromise.query(
        `SELECT * FROM tokens2fa
         WHERE id_usuario = ? AND estado = 'Activo'
         ORDER BY id_token DESC LIMIT 1`,
        [user.id_usuario]
      );

      if (tokens.length === 0)
        return res.status(404).json({ error: "No hay cÃ³digo activo." });

      const tokenData = tokens[0];
      const valido = await bcrypt.compare(String(otp), tokenData.codigo_otp);
      if (!valido)
        return res.status(401).json({ error: "CÃ³digo incorrecto o expirado." });

      await poolPromise.query(
        "UPDATE tokens2fa SET estado = 'Usado' WHERE id_token = ?",
        [tokenData.id_token]
      );

      const accessToken = JWTService.generateAccessToken({
        id: user.id_usuario,
        id_usuario: user.id_usuario,
        correo: user.correo || null,
        telefono,
        nombre: user.nombre,
        rol: user.nombre_rol,
        metodo_autenticacion: "SMS",
      });
      const refreshToken = crypto.randomUUID();

      await RefreshModel.save(user.id_usuario, refreshToken);
      await SessionModel.save(user.id_usuario, accessToken, req.ip);

      res.json({
        success: true,
        message: "AutenticaciÃ³n por SMS exitosa.",
        token: accessToken,
        accessToken,
        refreshToken,
        user: {
          id: user.id_usuario,
          id_usuario: user.id_usuario,
          nombre: user.nombre,
          correo: user.correo || null,
          telefono,
          rol: user.nombre_rol,
          metodo_autenticacion: "SMS",
        },
      });
    } catch (error) {
      console.error("Error en verifyOTP:", error.message);
      res
        .status(500)
        .json({ error: "Error al verificar OTP.", details: error.message });
    }
  }
}
