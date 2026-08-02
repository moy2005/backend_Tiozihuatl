import unittest
import csv
from collections import Counter
from pathlib import Path

import joblib

from src.modules.recommendations.python_service.clustering import predict_book_clusters

CLUSTERING_ARTIFACT_PATH = Path(__file__).resolve().parents[2] / "data" / "clustering_libros_mensual.joblib"
DATASET_PATH = Path(__file__).resolve().parents[5] / "data_mining" / "datasets" / "clustering_libros_biblioteca_mensual.csv"


class ClusteringPredictionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.artifact = joblib.load(CLUSTERING_ARTIFACT_PATH)

    def test_predicts_with_the_saved_pipeline(self):
        record = {"libro_id": 1}
        record.update({name: 0 for name in self.artifact["variables_x"]})
        result = predict_book_clusters(self.artifact, [record])
        self.assertEqual(result[0]["book_id"], 1)
        self.assertIn(result[0]["cluster"], (0, 1, 2))
        self.assertIn(result[0]["profile_name"], self.artifact["nombres_cluster"].values())

    def test_rejects_missing_variables(self):
        with self.assertRaises(ValueError):
            predict_book_clusters(self.artifact, [{"libro_id": 1}])

    def test_reproduces_the_36_92_7_training_distribution(self):
        with DATASET_PATH.open(encoding="utf-8-sig", newline="") as source:
            records = list(csv.DictReader(source))
        predictions = predict_book_clusters(self.artifact, records)
        self.assertEqual(Counter(item["cluster"] for item in predictions), {0: 36, 1: 92, 2: 7})


if __name__ == "__main__":
    unittest.main()
