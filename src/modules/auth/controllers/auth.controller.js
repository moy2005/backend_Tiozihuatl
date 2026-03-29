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

dotenv.config();

export const AuthController = {

  // ============================================================
  // 1) PRE-REGISTRO (PASO 1)
  // ============================================================
  preRegistro: async (req, res) => {
    try {
      const { nombre, apaterno, amaterno, correo, telefono } = req.body;

      if (!nombre || !apaterno || !amaterno || !correo || !telefono)
        return res.status(400).json({ error: "Faltan datos obligatorios." });

      // validar que NO exista en usuarios (usuario REAL)
      const [usrReal] = await poolPromise.query(
        "SELECT id_usuario FROM usuarios WHERE correo = ?",
        [correo]
      );
      if (usrReal.length > 0)
        return res.status(409).json({ error: "Este correo ya está registrado." });

      // validar que NO exista pre-registro
      const [preExist] = await poolPromise.query(
        "SELECT id_pre FROM pre_registros WHERE correo = ?",
        [correo]
      );
      if (preExist.length > 0)
        await poolPromise.query("DELETE FROM pre_registros WHERE correo = ?", [
          correo,
        ]); // limpiar registro previo

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

      const link = `${process.env.FRONTEND_URL}/verificar-correo?token=${token}`;

   await sendMail({
  to: correo,
  subject: "Verifica tu correo",
  html: `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verificación de Correo</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .email-wrapper {
          padding: 40px 20px;
          min-height: 100vh;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%);
          position: relative;
          padding: 60px 40px;
          text-align: center;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 15s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(180deg); }
        }
        .header-content {
          position: relative;
          z-index: 1;
        }
        .logo-container {
          display: inline-block;
          margin-bottom: 20px;
          position: relative;
        }
        .logo-container::before {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background: linear-gradient(45deg, #3b82f6, #60a5fa, #93c5fd, #3b82f6);
          border-radius: 50%;
          opacity: 0.3;
          animation: rotate 3s linear infinite;
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .header img {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          position: relative;
          z-index: 1;
          background: #ffffff;
          padding: 5px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        .header p {
          margin: 8px 0 0;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 400;
        }
        .content {
          padding: 50px 40px;
          background: #ffffff;
        }
        .welcome-message {
          text-align: center;
          margin-bottom: 30px;
        }
        .welcome-icon {
          font-size: 64px;
          margin-bottom: 16px;
          display: block;
        }
        .welcome-title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 12px;
          font-weight: 700;
        }
        .content p {
          line-height: 1.7;
          margin: 0 0 20px;
          color: #4b5563;
          font-size: 15px;
          text-align: center;
        }
        .button-section {
          margin: 40px 0;
          text-align: center;
        }
        .button-label {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          color: #ffffff !important;
          padding: 18px 48px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.3);
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
        }
        .link-box {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          border: 2px solid #d1d5db;
          border-radius: 12px;
          padding: 20px;
          margin: 30px 0;
          word-break: break-all;
        }
        .link-label {
          font-size: 13px;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-align: center;
        }
        .link-url {
          color: #2563eb;
          font-size: 14px;
          font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
          word-wrap: break-word;
          text-align: center;
        }
        .info-box {
          background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
          border-left: 4px solid #2563eb;
          padding: 20px 24px;
          border-radius: 12px;
          margin: 30px 0;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        }
        .info-box p {
          margin: 0;
          color: #1e40af;
          font-size: 14px;
          line-height: 1.6;
          text-align: center;
        }
        .info-box strong {
          color: #1e3a8a;
          font-weight: 700;
        }
        .info-icon {
          font-size: 20px;
          margin-right: 8px;
          vertical-align: middle;
        }
        .features {
          display: table;
          width: 100%;
          margin: 30px 0;
        }
        .feature-item {
          display: table-row;
        }
        .feature-icon {
          display: table-cell;
          width: 40px;
          padding: 12px 0;
          font-size: 24px;
          text-align: center;
          vertical-align: top;
        }
        .feature-text {
          display: table-cell;
          padding: 12px 0 12px 16px;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.6;
          vertical-align: top;
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);
          margin: 40px 0;
        }
        .footer {
          background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
          padding: 40px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-logo {
          margin-bottom: 16px;
          opacity: 0.6;
        }
        .footer p {
          margin: 8px 0;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.6;
        }
        .footer-links {
          margin-top: 20px;
        }
        .footer-links a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
          padding: 10px 24px;
          background: #eff6ff;
          border-radius: 8px;
          display: inline-block;
          transition: all 0.3s ease;
          font-size: 14px;
        }
        .social-links {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }
        .social-links p {
          font-size: 12px;
          color: #9ca3af;
        }
        
        @media (max-width: 600px) {
          .email-wrapper {
            padding: 20px 10px;
          }
          .container {
            border-radius: 16px;
          }
          .header {
            padding: 40px 24px;
          }
          .header h1 {
            font-size: 22px;
          }
          .content {
            padding: 32px 24px;
          }
          .welcome-icon {
            font-size: 48px;
          }
          .welcome-title {
            font-size: 20px;
          }
          .cta-button {
            padding: 16px 36px;
            font-size: 15px;
          }
          .link-box {
            padding: 16px;
          }
          .footer {
            padding: 32px 24px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <div class="header-content">
              <div class="logo-container">
                <img src="https://res.cloudinary.com/dazzy4wzq/image/upload/v1761524498/logo1_nxe85q.png" alt="Instituto Tiozihuatl">
              </div>
              <h1>Verificación de Correo</h1>
              <p>Confirma tu cuenta para continuar</p>
            </div>
          </div>
          
          <div class="content">
            <div class="welcome-message">
              <span class="welcome-icon">✉️</span>
              <h2 class="welcome-title">¡Bienvenido a Tiozihuatl!</h2>
            </div>
            
            <p>Estás a un paso de completar tu registro. Para continuar y activar tu cuenta, verifica tu correo electrónico haciendo clic en el botón de abajo:</p>

            <div class="button-section">
              <div class="button-label">Verificar cuenta</div>
              <a href="${link}" class="cta-button">
                ✓ Verificar mi correo
              </a>
            </div>

            <div class="divider"></div>

            <div class="link-box">
              <div class="link-label">Si el botón no funciona, copia este enlace:</div>
              <div class="link-url">${link}</div>
            </div>

            <div class="info-box">
              <p>
                <span class="info-icon">⏱️</span>
                <strong>Importante:</strong> Este enlace expira en <strong>1 hora</strong>. Si no verificas tu correo en este tiempo, deberás solicitar un nuevo enlace.
              </p>
            </div>

            <div class="divider"></div>

            <div class="features">
              <div class="feature-item">
                <div class="feature-icon">🎓</div>
                <div class="feature-text">
                  <strong>Acceso completo</strong> a todos los recursos educativos
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📚</div>
                <div class="feature-text">
                  <strong>Gestión de cursos</strong> y materiales académicos
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🔒</div>
                <div class="feature-text">
                  <strong>Cuenta segura</strong> con protección de datos
                </div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-logo">
              <p><strong>Instituto de Estudios Superiores Tiozihuatl</strong></p>
            </div>
            <p>© ${new Date().getFullYear()} Todos los derechos reservados</p>
            <div class="footer-links">
              <a href="https://frontiozihuatl.netlify.app/">Visitar Portal Institucional</a>
            </div>
            <div class="social-links">
              <p>Este es un correo automático, por favor no responder.</p>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
});

      await AuditService.logEvent({
        tipo_evento: "PRE_REGISTRO",
        descripcion: `Pre-registro iniciado para ${correo}`,
        ip_origen: req.ip,
      });

      res.json({
        message: "Revisa tu correo para continuar con el registro.",
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
        "SELECT id_pre, token_expira FROM pre_registros WHERE token_verificacion = ?",
        [token]
      );

      if (pre.length === 0)
        return res.status(400).json({ error: "Token inválido." });

      const { id_pre, token_expira } = pre[0];

      if (new Date(token_expira) < new Date())
        return res.status(400).json({ error: "El enlace ha expirado." });

      // marcar como verificado
      await poolPromise.query(
        "UPDATE pre_registros SET verificado = 1 WHERE id_pre = ?",
        [id_pre]
      );

      res.json({ verified: true });

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
        rol: user.nombre_rol 
      },
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

    const valid = await RefreshModel.validate(id_usuario, refreshToken);
    if (!valid)
      return res.status(401).json({ error: "Token inválido o expirado." });

    // ✅ Recuperar el usuario para incluir el rol en el nuevo token
    const [rows] = await poolPromise.query(
      `SELECT U.id_usuario, U.correo, R.nombre_rol
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
    });
    const newRefresh = uuidv4();

    await RefreshModel.save(id_usuario, newRefresh, 7);

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
};
