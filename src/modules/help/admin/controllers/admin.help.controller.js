import { HelpModel } from "../../models/help.model.js";

export const AdminHelpController = {
  getAll: async (req, res) => {
    const rows = await HelpModel.getAllAdmin();
    res.json(rows);
  },

  create: async (req, res) => {
    await HelpModel.create(req.body);
    res.status(201).json({ message: "FAQ creada correctamente" });
  },

  update: async (req, res) => {
    await HelpModel.update(req.params.id, req.body);
    res.json({ message: "FAQ actualizada correctamente" });
  },

  delete: async (req, res) => {
    await HelpModel.delete(req.params.id);
    res.json({ message: "FAQ eliminada correctamente" });
  }
};
