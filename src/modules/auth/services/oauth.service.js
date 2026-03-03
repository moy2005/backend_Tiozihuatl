import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { poolPromise } from "../../../config/db.config.js";

// ============================
// GOOGLE (SOLO SI HAY ENV)
// ============================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== "disabled") {
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
          if (!email) return done(null, false);

          const [rows] = await poolPromise.query(
            "SELECT * FROM usuarios WHERE correo = ? LIMIT 1",
            [email]
          );

          if (rows.length) return done(null, rows[0]);

          return done(null, false);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
} else {
  console.warn("⚠️ Google OAuth deshabilitado (env no configurado)");
}

// ============================
// FACEBOOK (SOLO SI HAY ENV)
// ============================
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_ID !== "disabled") {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ["id", "emails", "name", "displayName"],
      },
      async (accessToken, refreshToken, profile, done) => {
        done(null, false);
      }
    )
  );
} else {
  console.warn("⚠️ Facebook OAuth deshabilitado (env no configurado)");
}

// ============================
// SERIALIZACIÓN
// ============================
passport.serializeUser((user, done) => done(null, user?.id_usuario));
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
