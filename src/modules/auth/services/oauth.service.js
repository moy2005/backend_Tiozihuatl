import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { poolPromise } from "../../../config/db.config.js";

/**
 * ================================================================
 * FUNCIONES AUXILIARES
 * ================================================================
 */
async function getVisitanteRoleId() {
  const [roles] = await poolPromise.query(
    "SELECT id_rol FROM roles WHERE nombre_rol = 'Visitante' LIMIT 1"
  );
  return roles[0]?.id_rol || 4; // fallback por si no existe
}

/**
 * ================================================================
 * GOOGLE STRATEGY
 * ================================================================
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const nombre = profile.displayName || "Usuario Google";
        const proveedor = "Google";

        if (!email) {
          return done(null, false, {
            message:
              "Google no proporcionó un correo electrónico. Por favor, autoriza el permiso de email.",
          });
        }

        // Buscar usuario existente
        const [rows] = await poolPromise.query(
          "SELECT * FROM usuarios WHERE correo = ? LIMIT 1",
          [email]
        );

        let user;
        if (rows.length > 0) {
          user = rows[0];
          // Actualizar proveedor si no está registrado
          if (!user.proveedor_oauth) {
            await poolPromise.query(
              "UPDATE usuarios SET proveedor_oauth = ? WHERE correo = ?",
              [proveedor, email]
            );
            user.proveedor_oauth = proveedor;
          }
        } else {
          // Rol Visitante obligatorio
          const id_rol = await getVisitanteRoleId();

          const [insert] = await poolPromise.query(
            `INSERT INTO usuarios 
             (id_rol, nombre, correo, telefono, contrasena, metodo_autenticacion, proveedor_oauth, estado, fecha_registro)
             VALUES (?, ?, ?, NULL, 'OAUTH_NO_PASSWORD', 'OAuth', ?, 'Activo', NOW())`,
            [id_rol, nombre, email, proveedor]
          );

          const [newUser] = await poolPromise.query(
            "SELECT * FROM usuarios WHERE id_usuario = ?",
            [insert.insertId]
          );
          user = newUser[0];
        }

        return done(null, user);
      } catch (err) {
        console.error("❌ Error en Google OAuth:", err.message);
        done(err, null);
      }
    }
  )
);

/**
 * ================================================================
 * FACEBOOK STRATEGY
 * ================================================================
 */
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "emails", "name", "displayName"],
      enableProof: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const proveedor = "Facebook";
        const facebookId = profile.id;
        const email = profile.emails?.[0]?.value || null;
        const nombre =
          profile.displayName ||
          `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim() ||
          "Usuario Facebook";

        // Si Facebook no proporciona correo, generamos uno temporal
        const correoFinal = email || `facebook_${facebookId}@temp.oauth`;

        // Buscar usuario existente
        const [rows] = await poolPromise.query(
          "SELECT * FROM usuarios WHERE correo = ? LIMIT 1",
          [correoFinal]
        );

        let user;
        if (rows.length > 0) {
          user = rows[0];
          if (!user.proveedor_oauth) {
            await poolPromise.query(
              "UPDATE usuarios SET proveedor_oauth = ? WHERE correo = ?",
              [proveedor, correoFinal]
            );
          }
        } else {
          const id_rol = await getVisitanteRoleId();

          const [insert] = await poolPromise.query(
            `INSERT INTO usuarios 
             (id_rol, nombre, correo, telefono, contrasena, metodo_autenticacion, proveedor_oauth, estado, fecha_registro)
             VALUES (?, ?, ?, ?, 'OAUTH_NO_PASSWORD', 'OAuth', ?, 'Activo', NOW())`,
            [id_rol, nombre, correoFinal, `OAUTH_${Date.now()}`, proveedor]
          );

          const [newUser] = await poolPromise.query(
            "SELECT * FROM usuarios WHERE id_usuario = ?",
            [insert.insertId]
          );
          user = newUser[0];
        }

        return done(null, user);
      } catch (err) {
        console.error("❌ Error en Facebook OAuth:", err.message);
        done(err, null);
      }
    }
  )
);

/**
 * ================================================================
 * SERIALIZACIÓN / DESERIALIZACIÓN
 * ================================================================
 */
passport.serializeUser((user, done) => done(null, user.id_usuario));

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await poolPromise.query(
      "SELECT * FROM usuarios WHERE id_usuario = ? LIMIT 1",
      [id]
    );
    done(null, rows[0]);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
