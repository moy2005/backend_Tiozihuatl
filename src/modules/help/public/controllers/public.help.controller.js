import { HelpModel } from "../../models/help.model.js";

export const PublicHelpController = {
 getFaqs: async (req, res) => {
    try {
      const contacto = await ContactInfoModel.getPublic();
      res.status(200).json(contacto || {});
    } catch (error) {
      console.error(" Error en GET /api/contact:", error);
      res.status(500).json({
        message: "Error al obtener información de contacto"
      });
    }
  }
};
