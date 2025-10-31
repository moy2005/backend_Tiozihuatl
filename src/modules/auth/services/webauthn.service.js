import { Fido2Lib } from "fido2-lib";
import { poolPromise } from "../../../config/db.config.js";
import pkg from "cbor";
const { decodeFirstSync } = pkg;

// ========================
// CONFIGURACIÓN PRINCIPAL
// ========================
const f2l = new Fido2Lib({
  timeout: 60000,
  rpId: process.env.RP_ID,
  rpName: process.env.RP_NAME, 
  challengeSize: 32,
  attestation: "none",
  cryptoParams: [-7, -257], // ES256 y RS256
  authenticatorAttachment: "platform",
  authenticatorRequireResidentKey: false,
  authenticatorUserVerification: "required",
});

// ==========================================================
// FUNCIÓN DE VERIFICACIÓN DE REGISTRO (ATTESTATION)
// ==========================================================
export async function verifyAttestationResponse(attestationResponse, expectedChallenge, correo) {
  try {
    const decoder = new TextDecoder("utf-8");
    const clientDataJSON = decoder.decode(attestationResponse.response.clientDataJSON);
    const clientData = JSON.parse(clientDataJSON);
    const challengeFromClient = clientData.challenge;

    const attestationExpectations = {
      challenge: challengeFromClient,
      origin: `https://${process.env.RP_ID}`, // ✅ origen real
      factor: "either",
    };

    let result;
    try {
      result = await f2l.attestationResult(attestationResponse, attestationExpectations);
    } catch (err) {
      // ⚠️ Si falla por TPM u otros formatos no estándar
      if (err.message?.toLowerCase().includes("tpm")) {
        try {
          const attestationObjectBuffer = Buffer.from(attestationResponse.response.attestationObject);
          const attestationObject = decodeFirstSync(attestationObjectBuffer);

          if (attestationObject.authData) {
            const authData = Buffer.from(attestationObject.authData);
            const counter = authData.readUInt32BE(33);
            const publicKeyData = authData.toString("base64");

            return {
              publicKey: publicKeyData,
              counter,
              credentialId: attestationResponse.id,
              extractedManually: true,
            };
          } else {
            throw new Error("No se encontró authData en attestationObject");
          }
        } catch (manualError) {
          throw new Error(`Error al extraer clave pública manualmente: ${manualError.message}`);
        }
      }
      throw err;
    }

    const publicKeyPem = result.authnrData.get("credentialPublicKeyPem");
    if (!publicKeyPem) {
      return { error: "No se pudo extraer la clave pública del dispositivo" };
    }

    return {
      publicKey: publicKeyPem,
      counter: result.authnrData.get("counter") || 0,
      credentialId: attestationResponse.id,
    };
  } catch (error) {
    console.error("❌ Error en verifyAttestationResponse:", error.message);
    return { error: error.message };
  }
}

// ==========================================================
// FUNCIÓN DE VERIFICACIÓN DE LOGIN (ASSERTION)
// ==========================================================
export async function verifyAssertionResponse(assertionResponse, correo) {
  try {
    const [rows] = await poolPromise.query(
      "SELECT publicKey, prevCounter, credentialId FROM usuarios WHERE correo = ? LIMIT 1",
      [correo]
    );

    if (rows.length === 0) {
      return { error: "Usuario no encontrado" };
    }

    const user = rows[0];
    if (!user.publicKey) {
      return { error: "No hay clave pública registrada para este usuario" };
    }

    const decoder = new TextDecoder("utf-8");
    const clientDataJSON = decoder.decode(assertionResponse.response.clientDataJSON);
    const clientData = JSON.parse(clientDataJSON);

    const assertionExpectations = {
      challenge: clientData.challenge,
      origin: `https://${process.env.RP_ID}`, // ✅ origen real
      factor: "either",
      publicKey: user.publicKey,
      prevCounter: user.prevCounter || 0,
      userHandle: Buffer.from(correo).toString("base64"),
    };

    const result = await f2l.assertionResult(assertionResponse, assertionExpectations);

    // Actualizar el contador de seguridad
    await poolPromise.query(
      "UPDATE usuarios SET prevCounter = ? WHERE correo = ?",
      [result.authnrData.get("counter"), correo]
    );

    return {
      verified: true,
      counter: result.authnrData.get("counter"),
    };
  } catch (error) {
    console.error("❌ Error en verifyAssertionResponse:", error.message);
    return { error: error.message };
  }
}
