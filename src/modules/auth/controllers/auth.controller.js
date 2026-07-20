import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";
import { UserModel } from "../models/user.model.js";
import { JWTService } from "../../../core/services/jwt.service.js";
import { SessionModel } from "../models/session.model.js";
import { RefreshModel } from "../models/refresh.model.js";
import { AuditService } from "../../../core/services/audit.service.js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { sendMail } from "../../../core/services/mail.service.js";
import { buildVerificationEmail } from "../../../core/templates/auth-email.templates.js";

dotenv.config();

const VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000;
const VERIFICATION_EMAIL_COOLDOWN_SECONDS = 5 * 60;

export const AuthController = {

  // ============================================================
  // 1) PRE-REGISTRO (PASO 1)
  // ============================================================
  preRegistro: async (req, res) => {
    try {
      const { nombre, apaterno, amaterno, correo, telefono } = req.body;

      if (!nombre || !apaterno || !amaterno || !correo || !telefono)
        return res.status(400).json({ error: "Faltan datos obligatorios." });

      const frontendUrl = String(process.env.FRONTEND_URL || "").replace(
        /\/+$/,
        ""
      );
      if (!frontendUrl) {
        return res.status(503).json({
          error:
            "El envio de correos no esta disponible temporalmente. Intenta mas tarde.",
        });
      }

      // validar que NO exista en usuarios (usuario REAL)
      const [usrReal] = await poolPromise.query(
        "SELECT id_usuario FROM usuarios WHERE correo = ?",
        [correo]
      );
      if (usrReal.length > 0)
        return res.status(409).json({ error: "Este correo ya está registrado." });

      // Evitar reenvios consecutivos: Brevo ya reintenta las entregas diferidas.
      const [preExist] = await poolPromise.query(
        "SELECT id_pre, token_expira, verificado FROM pre_registros WHERE correo = ?",
        [correo]
      );

      if (preExist.length > 0) {
        if (Number(preExist[0].verificado) === 1) {
          return res.status(409).json({
            code: "EMAIL_ALREADY_VERIFIED",
            error:
              "Este correo ya fue verificado. Continúa con la creación de tu contraseña.",
          });
        }

        const tokenExpiresAt = new Date(preExist[0].token_expira).getTime();
        const lastSentAt = tokenExpiresAt - VERIFICATION_TOKEN_TTL_MS;
        const elapsedSeconds = Math.max(
          0,
          Math.floor((Date.now() - lastSentAt) / 1000)
        );
        const retryAfterSeconds = Math.max(
          0,
          VERIFICATION_EMAIL_COOLDOWN_SECONDS - elapsedSeconds
        );

        if (retryAfterSeconds > 0) {
          res.set("Retry-After", String(retryAfterSeconds));
          return res.status(429).json({
            code: "VERIFICATION_EMAIL_COOLDOWN",
            error:
              "Ya enviamos un enlace de verificación. Espera antes de solicitar otro.",
            retryAfterSeconds,
          });
        }

        await poolPromise.query("DELETE FROM pre_registros WHERE correo = ?", [
          correo,
        ]);
      }

      const token = crypto.randomUUID();
      const tokenExpira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await poolPromise.query(
        `INSERT INTO pre_registros 
         (nombre, apaterno, amaterno, correo, telefono, token_verificacion, token_expira)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre,
          apaterno,
          amaterno,
          correo,
          telefono,
          token,
          tokenExpira,
        ]
      );

      const link = `${frontendUrl}/verificar-correo?token=${encodeURIComponent(
        token
      )}`;

      const mailResult = await sendMail({
        to: correo,
        subject: "Confirma tu correo para completar tu registro",
        text: `Hola ${nombre}. Para continuar con tu registro como visitante en Tiozihuatl, verifica tu correo desde este enlace: ${link}. El enlace vence en 1 hora.`,
        tags: ["registro-visitante"],
        html: buildVerificationEmail({ name: nombre, actionUrl: link }),
      });

      if (!mailResult.success) {
        await poolPromise.query(
          "DELETE FROM pre_registros WHERE correo = ? AND token_verificacion = ?",
          [correo, token]
        );
        console.error(
          "No se pudo enviar el correo de verificacion:",
          mailResult.code || mailResult.error
        );
        return res.status(503).json({
          error:
            "No fue posible enviar el correo de verificacion. Intenta nuevamente en unos minutos.",
        });
      }

      await AuditService.logEvent({
        tipo_evento: "PRE_REGISTRO",
        descripcion: `Pre-registro iniciado para ${correo}`,
        ip_origen: req.ip,
      });

      res.json({
        message:
          "Te enviamos un enlace para verificar tu correo. Puede tardar unos minutos; no es necesario solicitarlo nuevamente.",
        retryAfterSeconds: VERIFICATION_EMAIL_COOLDOWN_SECONDS,
      });

    } catch (err) {
      console.error("Error en preRegistro:", err.message);
      res.status(500).json({ error: "Error interno." });
    }
  },

    // ============================================================
  // 2) VERIFICAR CORREO DESDE EL ENLACE
  // ============================================================
  verifyEmail: async (req, res) => {
    try {
      const { token } = req.query;

      if (!token)
        return res.status(400).json({ error: "Token requerido." });

      const [pre] = await poolPromise.query(
        "SELECT id_pre, correo, token_expira FROM pre_registros WHERE token_verificacion = ?",
        [token]
      );

      if (pre.length === 0)
        return res.status(400).json({ error: "Token inválido." });

      const { id_pre, correo, token_expira } = pre[0];

      if (new Date(token_expira) < new Date())
        return res.status(400).json({ error: "El enlace ha expirado." });

      // marcar como verificado
      await poolPromise.query(
        "UPDATE pre_registros SET verificado = 1 WHERE id_pre = ?",
        [id_pre]
      );

      res.json({ verified: true, correo });

    } catch (err) {
      console.error("Error en verifyEmail:", err.message);
      res.status(500).json({ error: "Error interno." });
    }
  },
  // ============================================================
  // 3) FINALIZAR REGISTRO (CREAR USUARIO REAL)
  // ============================================================
  finalizarRegistro: async (req, res) => {
    try {
      const { correo, contrasena, palabra_secreta } = req.body;

      if (!correo || !contrasena || !palabra_secreta)
        return res.status(400).json({ error: "Faltan datos." });

      // verificar pre-registro válido
      const [pre] = await poolPromise.query(
        "SELECT * FROM pre_registros WHERE correo = ? AND verificado = 1",
        [correo]
      );

      if (pre.length === 0)
        return res.status(400).json({ error: "No existe un pre-registro válido." });

      const datos = pre[0];

      // hash password
      const contrasenaHash = await bcrypt.hash(contrasena, 12);

      const palabra_secretaHash = await bcrypt.hash(palabra_secreta, 12);

      // crear usuario REAL
      await UserModel.createVisitante({
        nombre: datos.nombre,
        a_paterno: datos.apaterno,
        a_materno: datos.amaterno,
        correo: datos.correo,
        telefono: datos.telefono,
        contrasena: contrasenaHash,
        palabra_secreta: palabra_secretaHash,
      });

      // eliminar pre_registro
      await poolPromise.query("DELETE FROM pre_registros WHERE correo = ?", [
        correo,
      ]);

      await AuditService.logEvent({
        tipo_evento: "REGISTRO_FINALIZADO",
        descripcion: `Usuario creado: ${correo}`,
        ip_origen: req.ip,
      });

      res.json({ success: true, message: "Cuenta creada exitosamente." });

    } catch (err) {
      console.error("Error en finalizarRegistro:", err);
      res.status(500).json({ error: "Error interno." });
    }
  },


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

    const user = await UserModel.findByCredential(credential, rolSeleccionado);

    if (!user)
      return res.status(401).json({ error: "Usuario no encontrado." });

    if (user.estado === "pending_activation") {
      return res.status(403).json({
        error: "Tu cuenta aún no ha sido activada. " +
        "Solicita tu enlace de activación al administrador."
      });
    }

    // ============================================================
    // 🔒 1) VERIFICAR SI EL USUARIO ESTÁ BLOQUEADO POR INTENTOS
    // ============================================================
    const ahora = new Date();
    const bloqueadoHasta = user.bloqueado_hasta ? new Date(user.bloqueado_hasta) : null;

    // ⛔ Si la hora actual es menor al "bloqueado_hasta"
    if (bloqueadoHasta && ahora < bloqueadoHasta) {
      const minutosRestantes = Math.ceil((bloqueadoHasta - ahora) / 60000);
      return res.status(403).json({
        error: `Tu cuenta está bloqueada. Intenta en ${minutosRestantes} minuto(s).`
      });
    }

    // ============================================================
    // 🔒 2) VALIDAR ESTADO DEL USUARIO (ACTIVO)
    // ============================================================
    const estadoUsuario = (user.estado || "").toString().trim().toLowerCase();
    if (estadoUsuario !== "activo") {
      await AuditService.logEvent({
        id_usuario: user.id_usuario,
        tipo_evento: "LOGIN_BLOQUEADO",
        descripcion: `Intento de acceso con cuenta en estado: ${user.estado}`,
        ip_origen: req.ip,
      });

      return res.status(403).json({
        error: "Tu cuenta está inactiva o bloqueada. Contacta al administrador."
      });
    }

    // ============================================================
    // 🔐 3) VALIDAR ROL
    // ============================================================
    if (user.nombre_rol !== rolSeleccionado)
      return res.status(403).json({ error: "El rol no coincide con el usuario." });

    // ============================================================
    // 🔑 4) VALIDAR CONTRASEÑA
    // ============================================================
    const validPassword = await bcrypt.compare(contrasena, user.contrasena);

    if (!validPassword) {
      const nuevosIntentos = (user.intentos_fallidos || 0) + 1;

      // Guardar el intento fallido
      await poolPromise.query(
        "UPDATE usuarios SET intentos_fallidos = ? WHERE id_usuario = ?",
        [nuevosIntentos, user.id_usuario]
      );

      // ⛔ Si llegó a 3 intentos → bloquear 15 minutos
      if (nuevosIntentos >= 3) {
        const bloqueo = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        await poolPromise.query(
          "UPDATE usuarios SET bloqueado_hasta = ? WHERE id_usuario = ?",
          [bloqueo, user.id_usuario]
        );

        await AuditService.logEvent({
          id_usuario: user.id_usuario,
          tipo_evento: "LOGIN_BLOQUEO_TEMPORAL",
          descripcion: "Usuario bloqueado por múltiples intentos fallidos.",
          ip_origen: req.ip,
        });

        return res.status(403).json({
          error: "Has excedido los intentos permitidos. Tu cuenta fue bloqueada por 15 minutos."
        });
      }

      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    // ============================================================
    // ✔ 5) SI LA CONTRASEÑA ES CORRECTA → RESET INTENTOS
    // ============================================================
    await poolPromise.query(
      "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usuario = ?",
      [user.id_usuario]
    );

    // ============================================================
    // 🔐 6) GENERAR TOKENS
    // ============================================================
    const accessToken = JWTService.generateAccessToken(
      { 
        id: user.id_usuario,
        id_usuario: user.id_usuario,
        correo: user.correo,
        rol: user.nombre_rol,
        id_semestre: user.id_semestre ?? null //Nuevo 
      },
    );
    const refreshToken = uuidv4();

    await RefreshModel.save(user.id_usuario, refreshToken);
    await SessionModel.save(user.id_usuario, accessToken, req.ip);

    await AuditService.logEvent({
      id_usuario: user.id_usuario,
      tipo_evento: "LOGIN_EXITOSO",
      descripcion: `Inicio de sesión (${rolSeleccionado})`,
      ip_origen: req.ip,
    });

    return res.status(200).json({
      message: "Inicio de sesión exitoso.",
      accessToken,
      refreshToken,
      user: {
        id: user.id_usuario,
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        rol: user.nombre_rol,
        correo: user.correo,
        id_semestre: user.id_semestre ?? null, //Nuevo
      },
    });

  } catch (err) {
    console.error("Error en login:", err.message);
    return res.status(500).json({ error: "Error interno del servidor." });
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

    const sessionRecord = await RefreshModel.validate(id_usuario, refreshToken);
    if (!sessionRecord)
      return res.status(401).json({ error: "Token inválido o expirado." });

    // ✅ Recuperar el usuario para incluir el rol en el nuevo token
    const [rows] = await poolPromise.query(
      `SELECT U.id_usuario, U.correo, U.id_semestre, R.nombre_rol
       FROM usuarios U
       INNER JOIN roles R ON U.id_rol = R.id_rol
       WHERE U.id_usuario = ?
       LIMIT 1`,
      [id_usuario]
    );

    if (!rows || rows.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado." });

    const user = rows[0];

    // ✅ Nuevo accessToken con rol incluido
    const newAccess = JWTService.generateAccessToken({
      id: user.id_usuario,
      id_usuario: user.id_usuario,
      correo: user.correo,
      rol: user.nombre_rol,
      id_semestre: user.id_semestre ?? null,  //Nuevo
    });
    const newRefresh = uuidv4();

    await RefreshModel.rotate(id_usuario, sessionRecord.id_token, newRefresh);

    // ✅ Actualizar la sesión activa
    await SessionModel.save(id_usuario, newAccess, req.ip);

    res.status(200).json({
      message: "Tokens renovados correctamente.",
      accessToken: newAccess,
      refreshToken: newRefresh,
      user: {
        id: user.id_usuario, 
        id_usuario: user.id_usuario,
        correo: user.correo,
        rol: user.nombre_rol,
        id_semestre: user.id_semestre ?? null, //Nuevo
      },
    });
  } catch (err) {
    console.error("Error en refreshToken:", err.message);
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

  touchActivity: async (_req, res) => {
    res.status(204).send();
  },
};
