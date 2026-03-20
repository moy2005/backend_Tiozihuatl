import crypto from "crypto";
import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";
import { JWTService } from "../../../core/services/jwt.service.js";
import {
  verifyAttestationResponse,
  verifyAssertionResponse,
} from "../services/webauthn.service.js";
import { AuditService } from "../../../core/services/audit.service.js";
import { RefreshModel } from "../models/refresh.model.js";
import dotenv from "dotenv";

dotenv.config();

export class WebAuthnController {
/**
 * ================================================================
 * REGISTRAR BIOMETRÍA (usuario ya existe)
 * ================================================================
 */
static async registerBiometric(req, res) {
  const connection = await poolPromise.getConnection();
  try {
    const { correo, biometria } = req.body;

    if (!correo)
      return res.status(400).json({ error: "Correo requerido." });

    if (!biometria || !biometria.tipo || !biometria.credentialData)
      return res.status(400).json({ error: "Faltan datos biométricos." });

    // 1️⃣ Verificar usuario existente
    const [user] = await connection.query(
      "SELECT id_usuario FROM usuarios WHERE correo = ?",
      [correo]
    );

    if (user.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado." });

    await connection.beginTransaction();

    // 2️⃣ Procesar biometría
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

    // 3️⃣ Guardar biometría
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

    await AuditService.logEvent({
      tipo_evento: "REGISTRO_BIOMETRICO",
      descripcion: `Biometría agregada a ${correo}`,
      ip_origen: req.ip,
    });

    res.json({
      success: true,
      message: "Biometría registrada exitosamente.",
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Error en registro biométrico:", err.message);
    res.status(500).json({
      error: "Error en el registro biométrico.",
      details: err.message,
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
    const token = JWTService.generateAccessToken(
      {
        id: user.id_usuario,
        id_usuario: user.id_usuario,
        correo: user.correo,
        matricula: user.matricula || null,
        rol: user.nombre_rol,
        metodo_autenticacion: "Biometría",
      },
    );

    // 🔹 Generar RefreshToken compatible con flujo de login normal
    const refreshToken = crypto.randomUUID();
    // Guardar en la tabla tokensrefresh
    await RefreshModel.save(user.id_usuario, refreshToken, 7);
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
        id: user.id_usuario,
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
