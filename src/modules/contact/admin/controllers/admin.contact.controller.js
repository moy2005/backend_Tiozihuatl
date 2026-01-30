import { ContactInfoModel } from "../../models/contact.model.js";

export const AdminContactController = {
  getAll: async (req, res) => {
    const [rows] = await ContactInfoModel.getAllAdmin();
    res.json(rows);
  },

  save: async (req, res) => {
    await ContactInfoModel.createOrUpdate(req.body);
    res.json({ message: "Información de contacto actualizada" });
  }
};
