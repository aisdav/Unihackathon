import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.document_parser import _parse_txt, parse_document  # noqa: E402


class TestDocumentParser(unittest.TestCase):
    def test_parse_txt_supports_utf8_and_cp1251(self):
        sample = "Привет мир"

        self.assertEqual(_parse_txt(sample.encode("utf-8")), sample)
        self.assertEqual(_parse_txt(sample.encode("cp1251")), sample)

    def test_parse_document_rejects_unknown_file_type(self):
        with self.assertRaises(ValueError):
            parse_document(b"data", "xlsx")


if __name__ == "__main__":
    unittest.main()
