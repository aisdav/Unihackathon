import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.services.rag_service as rag_service  # noqa: E402


class TestRagService(unittest.TestCase):
    def tearDown(self):
        rag_service._collection = None
        rag_service._client = None
        rag_service._rag_disabled_reason = None

    def test_find_similar_examples_returns_empty_list_when_rag_unavailable(self):
        rag_service._rag_disabled_reason = "disabled"

        result = rag_service.find_similar_examples("test section")

        self.assertEqual(result, [])

    def test_find_similar_examples_formats_results(self):
        fake_results = {
            "documents": [["Example text"]],
            "metadatas": [[{"quality": "high", "annotation": "Good", "issue": "", "section_type": "purpose"}]],
            "distances": [[0.2]],
        }

        class FakeCollection:
            def count(self):
                return 3

            def query(self, **kwargs):
                return fake_results

        with patch.object(rag_service, "_get_collection", return_value=FakeCollection()):
            result = rag_service.find_similar_examples("goal text", section_type="purpose", top_k=3)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["text"], "Example text")
        self.assertEqual(result[0]["quality"], "high")
        self.assertEqual(result[0]["section_type"], "purpose")
        self.assertEqual(result[0]["similarity"], 0.8)


if __name__ == "__main__":
    unittest.main()
