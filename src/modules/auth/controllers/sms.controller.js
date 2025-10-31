import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";
import { TwilioService } from "../services/sms.service.js";
import { JWTService } from "../../../core/services/jwt.service.js";

export class SMSController {
  /**
   * ================================================================
   * ENVIAR OTP POR SMS (válido por 2 minutos)
   * ================================================================
   */
  static async sendOTP(req, res) {
    try {
      const { telefono } = req.body;

      if (!telefono)
        return res.status(400).json({ error: "Falta el número de teléfono." });

      const [rows] = await poolPromise.query(
        "SELECT id_usuario FROM usuarios WHERE telefono = ?",
        [telefono]
      );

      if (rows.length === 0)
        return res.status(404).json({ error: "Teléfono no registrado." });

      const user = rows[0];

      // Generar OTP de 6 dígitos
      const otp = Math.floor(100000 + Math.random() * 900000);
      const otpHash = await bcrypt.hash(String(otp), 10);

      // Guardar OTP en tokens2fa
      const fechaExp = new Date(Date.now() + 2 * 60 * 1000); // 2 min
      await poolPromise.query(
        `INSERT INTO tokens2fa (id_usuario, codigo_otp, tipo, estado, fecha_expiracion)
         VALUES (?, ?, 'SMS', 'Activo', ?)`,
        [user.id_usuario, otpHash, fechaExp]
      );

      // Formatear número (añadir +52 si falta)
      const destino = telefono.startsWith("+") ? telefono : `+52${telefono}`;

      // Enviar SMS real con Twilio
      const smsResult = await TwilioService.sendSMS(
        destino,
        `Tu código de acceso es: ${otp}`
      );

      if (!smsResult.success)
        return res.status(500).json({ error: "Error al enviar SMS." });

      res.json({
        success: true,
        message: "Código OTP enviado correctamente.",
        telefono: destino,
      });
    } catch (error) {
      console.error("Error en sendOTP:", error.message);
      res
        .status(500)
        .json({ error: "Error al enviar SMS.", details: error.message });
    }
  }

  /**
   * ================================================================
   * VERIFICAR OTP Y GENERAR TOKEN JWT
   * ================================================================
   */
  static async verifyOTP(req, res) {
    try {
      const { telefono, otp } = req.body;

      if (!telefono || !otp)
        return res.status(400).json({ error: "Faltan datos." });

      const [users] = await poolPromise.query(
        "SELECT * FROM usuarios WHERE telefono = ?",
        [telefono]
      );

      if (users.length === 0)
        return res.status(404).json({ error: "Teléfono no registrado." });

      const user = users[0];

      // Obtener el último OTP activo
      const [tokens] = await poolPromise.query(
        `SELECT * FROM tokens2fa
         WHERE id_usuario = ? AND estado = 'Activo'
         ORDER BY id_token DESC LIMIT 1`,
        [user.id_usuario]
      );

      if (tokens.length === 0)
        return res.status(404).json({ error: "No hay código activo." });

      const tokenData = tokens[0];

      // Validar OTP
      const valido = await bcrypt.compare(String(otp), tokenData.codigo_otp);
      if (!valido)
        return res.status(401).json({ error: "Código incorrecto o expirado." });

      // Marcar OTP como usado
      await poolPromise.query(
        "UPDATE tokens2fa SET estado = 'Usado' WHERE id_token = ?",
        [tokenData.id_token]
      );

      // Generar JWT (válido por 1 hora)
      const token = JWTService.generateToken(
        {
          id_usuario: user.id_usuario,
          telefono,
          nombre: user.nombre,
        },
        "1h"
      );

      res.json({
        success: true,
        message: "Autenticación por SMS exitosa.",
        token,
        user: {
          id: user.id_usuario,
          nombre: user.nombre,
          correo: user.correo || null,
          telefono,
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
