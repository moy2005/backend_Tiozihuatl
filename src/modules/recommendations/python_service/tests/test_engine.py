import unittest

import numpy as np

from src.modules.recommendations.python_service.engine import (
    recommend_books,
)


class ContentRecommendationEngineTest(unittest.TestCase):
    def setUp(self):
        matrix = np.array(
            [
                [1, 1, 0, 0],
                [1, 0, 1, 0],
                [0, 0, 0, 1],
            ],
            dtype=np.float32,
        )
        self.artifact = {
            "book_ids": np.array([10, 20, 30]),
            "book_index": {10: 0, 20: 1, 30: 2},
            "feature_names": [
                "materia:1",
                "autor:1",
                "autor:2",
                "materia:2",
            ],
            "feature_labels": {
                "materia:1": "Materia: Anatomía",
                "autor:1": "Autor: Uno",
                "autor:2": "Autor: Dos",
                "materia:2": "Materia: Fisiología",
            },
            "matrix_binary": matrix,
            "parameters": {"minimum_similarity": 0.0},
        }

    def test_returns_only_positive_similarities(self):
        result = recommend_books(self.artifact, 10, 5)

        self.assertEqual([item["book_id"] for item in result], [20])
        self.assertGreater(result[0]["cosine_similarity"], 0)
        self.assertEqual(
            result[0]["shared_features"],
            ["Materia: Anatomía"],
        )

    def test_does_not_recommend_the_source_book(self):
        result = recommend_books(self.artifact, 10, 5)

        self.assertNotIn(10, [item["book_id"] for item in result])

    def test_returns_empty_when_there_are_no_matches(self):
        self.assertEqual(
            recommend_books(self.artifact, 30, 5),
            [],
        )

    def test_rejects_a_book_outside_the_artifact(self):
        with self.assertRaises(KeyError):
            recommend_books(self.artifact, 999, 5)


if __name__ == "__main__":
    unittest.main()
