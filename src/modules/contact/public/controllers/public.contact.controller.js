import { ContactInfoModel } from "../../models/contact.model.js";

export const PublicContactController = {
  getInfo: async (req, res) => {
    try {
      const contacto = await ContactInfoModel.getPublic();
      res.json(contacto || {});
    } catch (error) {
      console.error("❌ Error en GET /api/contact:", error);
      res.status(500).json({ message: "Error al obtener contacto" });
    }
  }
};
