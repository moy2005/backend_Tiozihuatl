import { ContactInfoModel } from "../../models/contact.model.js";

export const PublicContactController = {
  getInfo: async (req, res) => {
    const [rows] = await ContactInfoModel.getPublic();
    res.json(rows[0] || {});
  }
};

