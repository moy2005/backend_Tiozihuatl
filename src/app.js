import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import session from "express-session";
import passport from "./modules/auth/services/oauth.service.js";
import "./config/db.config.js";
import cronManager from "./modules/automation/cron.manager.js";

// 🔹 Importar rutas
import authRoutes from "./modules/auth/routes/auth.routes.js";
import oauthRoutes from "./modules/auth/routes/oauth.routes.js";
import webauthnRoutes from "./modules/auth/routes/webauthn.routes.js";
import smsRoutes from "./modules/auth/routes/sms.routes.js";
import passwordRoutes from "./modules/auth/routes/password.routes.js";
import userRoutes from "./modules/users/index.js";
import helpRoutes from "./modules/help/index.js";
import contactInfo from "./modules/contact/index.js";
import newsRoutes from "./modules/news/index.js";
import { sanitizeXSS } from "./core/middleware/xss.middleware.js";
import aboutModule from "./modules/about/index.js";         
import magazinesModule from './modules/magazines/index.js';   
import catalogRoutes from "./modules/catalog/public/routes/catalog.routes.js";
import adminCatalogRoutes from "./modules/catalog/admin/routes/admin.catalog.routes.js";
import calendarRoutes from "./modules/calendar/index.js";
import prestamoRoutes from "./modules/prestamos/index.js";    
import backupRoutes from "./modules/backups/index.js";      
import automationRoutes from "./modules/automation/index.js"; 

dotenv.config();
const app = express();
const isProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 4000;

// ================================================================
// 🧠 Proxy y Middlewares básicos
// ================================================================
if (isProduction) app.set("trust proxy", true);
app.use(express.json());
app.use('/uploads', express.static('uploads')); 

app.use('/uploads', express.static('uploads'));

// ================================================================
// 🛡️ Helmet
// ================================================================
app.use(
  helmet({
    xPoweredBy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    hsts: isProduction,
    frameguard: false 
  })
);

// ================================================================
// 🌐 CORS
// ================================================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:4200"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS no permitido para este dominio: " + origin), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], 
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ================================================================
// 💾 Sesiones
// ================================================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(sanitizeXSS);

// ================================================================
// 🚦 Rate Limiter
// ================================================================
const limiter = rateLimit({
  windowMs: 60 * 1000,
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

await cronManager.loadTasks();

// ================================================================
// 📡 Rutas base
// ================================================================
app.get("/", (req, res) => {
  res.send(`🚀 API funcionando en entorno ${isProduction ? "producción" : "local"}`);
});
app.get("/favicon.ico", (req, res) => res.status(204).end());

// ================================================================
// 🔗 Módulos
// ================================================================
app.use("/api/auth", authRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/webauthn", webauthnRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/users", userRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/contact", contactInfo);
app.use("/api/news", newsRoutes);           
aboutModule(app);                          
app.use("/api/magazines", magazinesModule); 
app.use("/api/calendar", calendarRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/catalog/admin', adminCatalogRoutes);
app.use("/api/prestamos", prestamoRoutes);  
app.use("/api/backups", backupRoutes);      
app.use("/api/automation", automationRoutes); 

export default app;
