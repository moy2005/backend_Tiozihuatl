import adminRoutes from "./admin/routes/admin.about.routes.js";
import publicRoutes from "./public/routes/public.about.routes.js";

export default (app) => {
  app.use("/api/admin/about", adminRoutes);
  app.use("/api/about", publicRoutes);
};
