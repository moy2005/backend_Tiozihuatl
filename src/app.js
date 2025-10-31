import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import session from "express-session";
import passport from "./modules/auth/services/oauth.service.js";
import "./config/db.config.js";

// 🔹 Importar rutas
import authRoutes from "./modules/auth/routes/auth.routes.js";
import oauthRoutes from "./modules/auth/routes/oauth.routes.js";
import webauthnRoutes from "./modules/auth/routes/webauthn.routes.js";
import smsRoutes from "./modules/auth/routes/sms.routes.js";
import passwordRoutes from "./modules/auth/routes/password.routes.js";
import userRoutes from "./modules/users/index.js";

// ================================================================
// 🔧 Configuración base
// ================================================================
dotenv.config();
const app = express();
const isProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 4000;

// ================================================================
// 🧠 Proxy y Middlewares básicos
// ================================================================
if (isProduction) app.set("trust proxy", true); // obligatorio en Vercel
app.use(express.json());

// ================================================================
// 🛡️ Helmet (ajustado para compatibilidad Vercel y local)
// ================================================================
app.use(
  helmet({
    xPoweredBy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    hsts: isProduction, // solo fuerza HTTPS en producción
  })
);

// ================================================================
// 🌐 Configuración dinámica de CORS
// ================================================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:4200"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // permite Postman
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS no permitido para este dominio: " + origin), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ================================================================
// 💾 Sesiones (para OAuth2 y WebAuthn)
// ================================================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // usa HTTPS solo en Vercel
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
    },
  })
);

// ================================================================
// 🔑 Passport (OAuth2 y sesión persistente)
// ================================================================
app.use(passport.initialize());
app.use(passport.session());

// ================================================================
// 🚦 Rate Limiter global
// ================================================================
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.ip;
    return ipKeyGenerator(ip);
  },
  message: "⚠️ Demasiadas peticiones desde esta IP. Intenta más tarde.",
});
app.use(limiter);

// ================================================================
// 📡 Rutas base
// ================================================================
app.get("/", (req, res) => {
  res.send(`🚀 API funcionando correctamente en entorno ${isProduction ? "de producción" : "local"}`);
});
app.get("/favicon.ico", (req, res) => res.status(204).end());

// ================================================================
// 🔗 Módulos principales
// ================================================================
app.use("/api/auth", authRoutes);       // Login, registro, tokens
app.use("/api/oauth", oauthRoutes);     // Google / Facebook
app.use("/api/webauthn", webauthnRoutes); // Biométrico
app.use("/api/sms", smsRoutes);         // SMS 2FA
app.use("/api/password", passwordRoutes); // Recuperación
app.use("/api/users", userRoutes);      // Perfiles y administración

// ================================================================
// 🚀 Exportar app para Vercel o uso local
// ================================================================
export default app;
