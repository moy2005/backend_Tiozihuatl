import { AboutModel } from "../../models/about.model.js";

export const PublicAboutService = {
  getPublic() {
    return AboutModel.getPublic();
  }
};
