import { HelpModel } from "../../models/help.model.js";

export const PublicHelpController = {
  getFaqs: async (req, res) => {
    const rows = await HelpModel.getPublic();
    res.json(rows);
  }
};
