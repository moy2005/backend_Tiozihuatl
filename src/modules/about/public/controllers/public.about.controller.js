import { PublicAboutService } from "../services/public.about.service.js";

export const PublicAboutController = {
  async get(req, res) {
    try {
      const data = await PublicAboutService.getPublic();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};
