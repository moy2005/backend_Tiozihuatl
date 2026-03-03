import { AdminAboutService } from "../services/admin.about.service.js";

export const AdminAboutController = {

  async getAll(req, res) {
    try {
      const data = await AdminAboutService.getAll();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async create(req, res) {
    try {
      const result = await AdminAboutService.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async update(req, res) {
    try {
      await AdminAboutService.update(req.params.id, req.body);
      res.json({ message: "Actualizado correctamente" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async delete(req, res) {
    try {
      await AdminAboutService.delete(req.params.id);
      res.json({ message: "Registro desactivado" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};
