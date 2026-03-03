import { AboutModel } from "../../models/about.model.js";

export const AdminAboutService = {

  getAll() {
    return AboutModel.getAll();
  },

  create(data) {
    if (!data.type || !data.title || !data.content) {
      throw new Error("Datos incompletos");
    }
    return AboutModel.create(data);
  },

  update(id, data) {
    return AboutModel.update(id, data);
  },

  delete(id) {
    return AboutModel.delete(id);
  }
};
