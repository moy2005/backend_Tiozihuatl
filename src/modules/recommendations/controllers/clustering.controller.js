import { getStudentClusterShelves } from "../services/clustering.service.js";

export const studentClusterShelves = async (req, res) => {
  try {
    res.json(await getStudentClusterShelves(req.query.limit));
  } catch (error) {
    console.error("Error al consultar los perfiles de lectura:", error);
    res.status(500).json({ message: "No fue posible cargar las sugerencias por perfil de lectura." });
  }
};
