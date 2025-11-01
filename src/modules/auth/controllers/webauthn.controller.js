import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";
import {
  verifyAttestationResponse,
  verifyAssertionResponse,
} from "../services/webauthn.service.js";
import { AuditService } from "../../../core/services/audit.service.js";
import dotenv from "dotenv";

dotenv.config();

export class WebAuthnController {
  /**
   * ================================================================
   * REGISTRO COMPLETO (Usuario + Biometría)
   * ================================================================
   */
  static async registerBiometric(req, res) {
    const connection = await poolPromise.getConnection();
    try {
      const {
        nombre,
        apaterno,
        amaterno,
        correo,
        telefono,
        contrasena,
        palabra_secreta,
        biometria,
      } = req.body;

      // Validar datos básicos
      if (
        !nombre ||
        !apaterno ||
        !amaterno ||
        !correo ||
        !telefono ||
        !contrasena ||
        !palabra_secreta
      )
        return res
          .status(400)
          .json({ error: "Faltan datos del usuario o la palabra secreta." });

      if (!biometria || !biometria.tipo || !biometria.credentialData)
        return res.status(400).json({ error: "Faltan datos biométricos." });

      await connection.beginTransaction();

      // 1️⃣ Verificar si el correo ya existe
      const [existing] = await connection.query(
        "SELECT id_usuario FROM usuarios WHERE correo = ?",
        [correo]
      );
      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: "El correo ya está registrado." });
      }

      // 2️⃣ Obtener id_rol del visitante
      const [roles] = await connection.query(
        "SELECT id_rol FROM roles WHERE nombre_rol = 'Visitante'"
      );
      const id_rol = roles[0]?.id_rol;
      if (!id_rol) {
        await connection.rollback();
        return res
          .status(500)
          .json({ error: "No se encontró el rol Visitante." });
      }

      // 3️⃣ Crear usuario visitante con palabra secreta
      const hashedPassword = await bcrypt.hash(contrasena, 10);
      await connection.query(
        `INSERT INTO usuarios 
        (id_rol, nombre, a_paterno, a_materno, correo, telefono, contrasena, palabra_secreta, estado, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activo', NOW())`,
        [
          id_rol,
          nombre,
          apaterno,
          amaterno,
          correo,
          telefono,
          hashedPassword,
          palabra_secreta,
        ]
      );

      // 4️⃣ Procesar biometría
      const { tipo, challenge, credentialData } = biometria;
      const base64ToBuffer = (b64) => Buffer.from(b64, "base64");
      const bufferToArrayBuffer = (buf) =>
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

      const attestationData = {
        id: credentialData.id,
        rawId: bufferToArrayBuffer(base64ToBuffer(credentialData.rawId)),
        type: credentialData.type,
        response: {
          clientDataJSON: bufferToArrayBuffer(
            base64ToBuffer(credentialData.response.clientDataJSON)
          ),
          attestationObject: bufferToArrayBuffer(
            base64ToBuffer(credentialData.response.attestationObject)
          ),
        },
      };

      const verifyResult = await verifyAttestationResponse(
        attestationData,
        challenge,
        correo
      );
      if (verifyResult.error) {
        await connection.rollback();
        return res.status(400).json({ error: verifyResult.error });
      }

      // 5️⃣ Guardar datos biométricos
      await connection.query(
        `UPDATE usuarios
       SET publicKey = ?, credentialId = ?, huella_biometrica = ?, prevCounter = ?
       WHERE correo = ?`,
        [
          verifyResult.publicKey,
          credentialData.id,
          tipo,
          verifyResult.counter || 0,
          correo,
        ]
      );

      await connection.commit();

      // 6️⃣ Registrar auditoría
      await AuditService.logEvent({
        tipo_evento: "REGISTRO_VISITANTE_BIOMETRICO",
        descripcion: `Registro biométrico exitoso de ${correo}`,
        ip_origen: req.ip,
      });

      res.json({
        success: true,
        message:
          "Usuario registrado con biometría y palabra secreta exitosamente.",
      });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error en registro biométrico:", error.message);
      res.status(500).json({
        error: "Error en el registro biométrico.",
        details: error.message,
      });
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * ================================================================
   * OPCIONES DE REGISTRO (Frontend)
   * ================================================================
   */
  static registerOptions(req, res) {
    try {
      const { correo, tipo } = req.body;
      const challenge = crypto.randomBytes(32).toString("base64");

      const options = {
        challenge,
        rp: { name: process.env.RP_NAME, id: process.env.RP_ID },
        user: {
          id: Buffer.from(correo).toString("base64"),
          name: correo,
          displayName: correo,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        timeout: 60000,
        authenticatorSelection: {
          authenticatorAttachment:
            tipo === "HUELLA" ? "platform" : "cross-platform",
          residentKey: "preferred",
          userVerification: "required",
        },
        attestation: "none",
      };

      res.json(options);
    } catch {
      res.status(500).json({ error: "Error al generar opciones WebAuthn." });
    }
  }

  /**
   * ================================================================
   * VERIFICAR REGISTRO (solo biometría)
   * ================================================================
   */
  static async registerVerify(req, res) {
    try {
      const { correo, tipo, challenge, credentialData } = req.body;

      const base64ToBuffer = (b64) => Buffer.from(b64, "base64");
      const bufferToArrayBuffer = (buf) =>
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

      const attestationData = {
        id: credentialData.id,
        rawId: bufferToArrayBuffer(base64ToBuffer(credentialData.rawId)),
        type: credentialData.type,
        response: {
          clientDataJSON: bufferToArrayBuffer(
            base64ToBuffer(credentialData.response.clientDataJSON)
          ),
          attestationObject: bufferToArrayBuffer(
            base64ToBuffer(credentialData.response.attestationObject)
          ),
        },
      };

      const result = await verifyAttestationResponse(
        attestationData,
        challenge,
        correo
      );
      if (result.error) return res.status(400).json({ error: result.error });

      const [update] = await poolPromise.query(
        `UPDATE usuarios
         SET publicKey = ?, credentialId = ?, huella_biometrica = ?, prevCounter = ?
         WHERE correo = ?`,
        [result.publicKey, credentialData.id, tipo, result.counter || 0, correo]
      );

      if (update.affectedRows === 0)
        return res.status(404).json({ error: "Usuario no encontrado." });

      res.json({
        success: true,
        message: "Biometría registrada correctamente.",
      });
    } catch (error) {
      res.status(500).json({
        error: "Error al verificar la autenticación biométrica.",
        details: error.message,
      });
    }
  }

  /**
   * ================================================================
   * OBTENER TIPO DE BIOMETRÍA
   * ================================================================
   */
  static async getTipo(req, res) {
    try {
      const { correo } = req.params;
      const [rows] = await poolPromise.query(
        "SELECT huella_biometrica AS metodo FROM usuarios WHERE correo = ?",
        [correo]
      );

      if (rows.length === 0)
        return res
          .status(404)
          .json({ error: "Usuario no encontrado o sin biometría." });

      res.json({ metodo: rows[0].metodo });
    } catch (error) {
      res.status(500).json({
        error: "Error al obtener tipo de biometría.",
        details: error.message,
      });
    }
  }

  /**
   * ================================================================
   * OPCIONES DE AUTENTICACIÓN (LOGIN)
   * ================================================================
   */
  static async authOptions(req, res) {
    try {
      const { correo } = req.body;
      const [users] = await poolPromise.query(
        "SELECT credentialId, huella_biometrica FROM usuarios WHERE correo = ?",
        [correo]
      );

      if (users.length === 0)
        return res.status(404).json({ error: "Usuario no encontrado." });

      const user = users[0];
      const challenge = crypto.randomBytes(32).toString("base64");

      const options = {
        challenge,
        timeout: 60000,
        rpId: process.env.RP_ID,
        allowCredentials: [
          {
            type: "public-key",
            id: user.credentialId,
            transports: ["internal"],
          },
        ],
        userVerification: "required",
      };

      res.json(options);
    } catch {
      res
        .status(500)
        .json({ error: "Error al generar opciones de autenticación." });
    }
  }

  /**
   * ================================================================
   * VERIFICAR AUTENTICACIÓN (LOGIN BIOMÉTRICO)
   * ================================================================
   */
static async authVerify(req, res) {
  try {
    const { credential, rolSeleccionado, assertionResponse } = req.body;
    if (!credential || !rolSeleccionado)
      return res
        .status(400)
        .json({ error: "Faltan credenciales o rol seleccionado." });

    const campoBusqueda =
      rolSeleccionado === "Visitante" ? "correo" : "matricula";

    const base64ToBuffer = (b64) => Buffer.from(b64, "base64");
    const bufferToArrayBuffer = (buf) =>
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    const assertionData = {
      id: assertionResponse.id,
      rawId: bufferToArrayBuffer(base64ToBuffer(assertionResponse.rawId)),
      type: "public-key",
      response: {
        clientDataJSON: bufferToArrayBuffer(
          base64ToBuffer(assertionResponse.response.clientDataJSON)
        ),
        authenticatorData: bufferToArrayBuffer(
          base64ToBuffer(assertionResponse.response.authenticatorData)
        ),
        signature: bufferToArrayBuffer(
          base64ToBuffer(assertionResponse.response.signature)
        ),
        userHandle: assertionResponse.response.userHandle
          ? bufferToArrayBuffer(
              base64ToBuffer(assertionResponse.response.userHandle)
            )
          : null,
      },
    };

    const result = await verifyAssertionResponse(assertionData, credential);
    if (result.error) return res.status(400).json({ error: result.error });

    const [users] = await poolPromise.query(
      `SELECT U.*, R.nombre_rol
       FROM usuarios U
       INNER JOIN roles R ON U.id_rol = R.id_rol
       WHERE U.${campoBusqueda} = ?`,
      [credential]
    );

    if (users.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado." });

    const user = users[0];

    if (user.nombre_rol !== rolSeleccionado)
      return res
        .status(403)
        .json({ error: "El rol no coincide con el usuario." });

    // 🔹 Generar AccessToken (igual que en login normal)
    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        correo: user.correo,
        matricula: user.matricula || null,
        rol: user.nombre_rol,
        metodo_autenticacion: "Biometría",
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 🔹 Generar RefreshToken compatible con flujo de login normal
    const refreshToken = crypto.randomUUID();
    await poolPromise.query(
      `INSERT INTO sesiones (id_usuario, refresh_token, fecha_creacion, expiracion)
       VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [user.id_usuario, refreshToken]
    );

    await AuditService.logEvent({
      id_usuario: user.id_usuario,
      tipo_evento: "LOGIN_BIOMETRICO_EXITOSO",
      descripcion: `Inicio de sesión biométrico (${rolSeleccionado}) con ${campoBusqueda}`,
      ip_origen: req.ip,
    });

    // 🔹 Respuesta completa con tokens y datos del usuario
    res.json({
      success: true,
      token,
      accessToken: token,
      refreshToken, // ✅ ahora sí existe
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        a_paterno: user.a_paterno,
        a_materno: user.a_materno,
        correo: user.correo,
        matricula: user.matricula,
        telefono: user.telefono,
        rol: user.nombre_rol,
        metodo_autenticacion: "Biometría",
        carrera: user.nombre_carrera || null,
        semestre: user.nombre_semestre || null,
        estado: user.estado || "Activo",
      },
      message: "Autenticación biométrica exitosa.",
    });
  } catch (error) {
    console.error("Error en authVerify:", error.message);
    res.status(500).json({
      error: "Error al verificar autenticación biométrica.",
      details: error.message,
    });
  }
}

}
