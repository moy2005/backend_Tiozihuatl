import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET no definido en .env");
}

const SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || SECRET;

export const JWTService = {

  /* ===============================
     TU VERSIÓN ORIGINAL (NO TOCADA)
  =============================== */
  generateToken: (payload, expiresIn = '1h') => {
    return jwt.sign(payload, SECRET, { expiresIn });
  },

  verifyToken: (token) => {
    try {
      return jwt.verify(token, SECRET);
    } catch (err) {
      return null;
    }
  },

  decodeToken: (token) => {
    try {
      return jwt.decode(token);
    } catch (err) {
      return null;
    }
  },

  /* ===============================
     NUEVAS FUNCIONES PROFESIONALES
  =============================== */

  generateAccessToken: (payload) => {
    return jwt.sign(payload, SECRET, {
      expiresIn: '15m',
      issuer: 'biblioteca-digital',
      audience: 'usuarios'
    });
  },

  generateRefreshToken: (payload) => {
    return jwt.sign(payload, REFRESH_SECRET, {
      expiresIn: '7d',
      issuer: 'biblioteca-digital'
    });
  },

  verifyAccessToken: (token) => {
    try {
      return jwt.verify(token, SECRET, {
        issuer: 'biblioteca-digital',
        audience: 'usuarios'
      });
    } catch {
      return null;
    }
  }
};
