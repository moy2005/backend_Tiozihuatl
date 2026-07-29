import { getBookRecommendations } from "../services/recommendation.service.js";

export const recommendationsForBook = async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const limit = Number(req.query.limit || 5);

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res
        .status(400)
        .json({ message: "El identificador del libro no es válido." });
    }

    const result = await getBookRecommendations(bookId, limit);
    if (!result) {
      return res
        .status(404)
        .json({ message: "Libro no encontrado o inactivo." });
    }

    return res.json(result);
  } catch (error) {
    console.error(
      "[Recommendations] recommendationsForBook:",
      error.message
    );
    return res
      .status(error.statusCode || 500)
      .json({
        message:
          error.publicMessage ||
          "Error al obtener recomendaciones.",
      });
  }
};
