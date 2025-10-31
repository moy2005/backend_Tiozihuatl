import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";
import { UserModel } from "../models/user.model.js";
import { JWTService } from "../../../core/services/jwt.service.js";
import { SessionModel } from "../models/session.model.js";
import { RefreshModel } from "../models/refresh.model.js";
import { AuditService } from "../../../core/services/audit.service.js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

export const AuthController = {
  /**
   * ================================================================
   * REGISTRO DE USUARIO — Rol por defecto: Visitante
   * ================================================================
   */
  register: async (req, res) => {
    try {
      const {
        nombre,
        apaterno,
        amaterno,
        correo,
        telefono,
        contrasena,
        palabra_secreta,
      } = req.body;

      if (
        !nombre ||
        !apaterno ||
        !amaterno ||
        !correo ||
        !telefono ||
        !contrasena ||
        !palabra_secreta
      )
        return res.status(400).json({ error: "Faltan datos obligatorios." });

      // Validar correo duplicado
      const [correoExistente] = await poolPromise.query(
        "SELECT id_usuario FROM usuarios WHERE correo = ?",
        [correo]
      );
      if (correoExistente.length > 0)
        return res.status(409).json({ error: "El correo ya está registrado." });

      // Validar teléfono duplicado
      const [telExistente] = await poolPromise.query(
        "SELECT id_usuario FROM usuarios WHERE telefono = ?",
        [telefono]
      );
      if (telExistente.length > 0)
        return res
          .status(409)
          .json({ error: "El teléfono ya está registrado." });

      // Hash de contraseña
      const contrasenaHash = await bcrypt.hash(contrasena, 12);

      // Crear usuario visitante (rol 4)
      await UserModel.createVisitante({
        nombre,
        a_paterno: apaterno,
        a_materno: amaterno,
        correo,
        telefono,
        contrasena: contrasenaHash,
        palabra_secreta,
      });

      await AuditService.logEvent({
        tipo_evento: "REGISTRO_VISITANTE",
        descripcion: `Registro de visitante ${correo}`,
        ip_origen: req.ip,
      });

      res.status(201).json({
        message: "Visitante registrado correctamente.",
      });
    } catch (err) {
      console.error("Error en registro:", err.message);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  },

  /**
   * ================================================================
   * VALIDAR CORREO Y TELÉFONO EXISTENTES
   * ================================================================
   */
  checkEmail: async (req, res) => {
    try {
      const { correo } = req.query;
      if (!correo) return res.status(400).json({ error: "Correo requerido." });

      const [result] = await poolPromise.query(
        "SELECT id_usuario FROM usuarios WHERE correo = ?",
        [correo]
      );

      res.json({ exists: result.length > 0 });
    } catch {
      res.status(500).json({ error: "Error interno del servidor." });
    }
  },

  checkPhone: async (req, res) => {
    try {
      const { telefono } = req.query;
      if (!telefono)
        return res.status(400).json({ error: "Teléfono requerido." });

      const [result] = await poolPromise.query(
        "SELECT id_usuario FROM usuarios WHERE telefono = ?",
        [telefono]
      );

      res.json({ exists: result.length > 0 });
    } catch {
      res.status(500).json({ error: "Error interno del servidor." });
    }
  },

  /**
   * ================================================================
   * LOGIN NORMAL — CONTRASEÑA + JWT + REFRESH TOKEN
   * ================================================================
   */
  login: async (req, res) => {
    try {
      const { credential, contrasena, rolSeleccionado } = req.body;

      if (!credential || !contrasena || !rolSeleccionado)
        return res.status(400).json({ error: "Faltan credenciales o rol." });

      const user = await UserModel.findByCredential(
        credential,
        rolSeleccionado
      );

      if (!user)
        return res.status(401).json({ error: "Usuario no encontrado." });

      // Validar rol
      if (user.nombre_rol !== rolSeleccionado)
        return res
          .status(403)
          .json({ error: "El rol no coincide con el usuario." });

      // Validar contraseña
      const validPassword = await bcrypt.compare(contrasena, user.contrasena);
      if (!validPassword)
        return res.status(401).json({ error: "Contraseña incorrecta." });

      // Generar tokens
      const accessToken = JWTService.generateToken(
        { id: user.id_usuario, rol: user.nombre_rol },
        "15m"
      );
      const refreshToken = uuidv4();

      await RefreshModel.save(user.id_usuario, refreshToken, 7);
      await SessionModel.save(user.id_usuario, accessToken, req.ip);

      await AuditService.logEvent({
        id_usuario: user.id_usuario,
        tipo_evento: "LOGIN_EXITOSO",
        descripcion: `Inicio de sesión (${rolSeleccionado})`,
        ip_origen: req.ip,
      });

      res.status(200).json({
        message: "Inicio de sesión exitoso.",
        accessToken,
        refreshToken,
        user: {
          id: user.id_usuario,
          nombre: user.nombre,
          rol: user.nombre_rol,
          correo: user.correo,
          matricula: user.matricula,
          carrera: user.carrera || null,
          semestre: user.nombre_semestre || null,
        },
      });
    } catch (err) {
      console.error("Error en login:", err.message);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  },

  /**
   * ================================================================
   * REFRESH TOKEN — ROTACIÓN DE TOKENS
   * ================================================================
   */
  refreshToken: async (req, res) => {
    try {
      const { id_usuario, refreshToken } = req.body;
      if (!id_usuario || !refreshToken)
        return res.status(400).json({ error: "Faltan datos." });

      const valid = await RefreshModel.validate(id_usuario, refreshToken);
      if (!valid)
        return res.status(401).json({ error: "Token inválido o expirado." });

      const newAccess = JWTService.generateToken({ id: id_usuario }, "15m");
      const newRefresh = uuidv4();

      await RefreshModel.save(id_usuario, newRefresh, 7);

      res.status(200).json({
        message: "Tokens renovados correctamente.",
        accessToken: newAccess,
        refreshToken: newRefresh,
      });
    } catch {
      res.status(500).json({ error: "Error al renovar token." });
    }
  },

  /**
   * ================================================================
   * LOGOUT — CIERRE DE SESIÓN
   * ================================================================
   */
  logout: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1];
      const { id_usuario } = req.body;

      if (!token)
        return res.status(400).json({ error: "Token no proporcionado." });

      const decoded = JWTService.verifyToken(token);
      if (!decoded)
        return res.status(403).json({ error: "Token inválido o expirado." });

      const userId = id_usuario || decoded.id;

      await SessionModel.close(userId);
      await RefreshModel.revoke(userId);

      await AuditService.logEvent({
        id_usuario: userId,
        tipo_evento: "LOGOUT",
        descripcion: "Cierre de sesión exitoso.",
        ip_origen: req.ip,
      });

      res.status(200).json({
        message: "Sesión cerrada correctamente.",
      });
    } catch {
      res.status(500).json({ error: "Error interno al cerrar sesión." });
    }
  },

  /**
   * ================================================================
   * VALIDAR SESIÓN ACTIVA
   * ================================================================
   */
  me: async (req, res) => {
    try {
      const user = req.user;
      res.status(200).json({
        message: "Usuario autenticado.",
        user: {
          id: user.id,
          correo: user.correo,
          rol: user.rol,
        },
      });
    } catch {
      res.status(401).json({ error: "Token inválido o expirado." });
    }
  },
};
