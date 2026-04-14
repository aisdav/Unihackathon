import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.analysis import _is_stale_running_analysis  # noqa: E402
from app.models.analysis import Analysis  # noqa: E402


class TestAnalysisAPIHelpers(unittest.TestCase):
    def test_running_analysis_becomes_stale_after_timeout(self):
        analysis = Analysis(
            status="running",
            updated_at=datetime.utcnow() - timedelta(minutes=5),
        )

        self.assertTrue(_is_stale_running_analysis(analysis))

    def test_recent_running_analysis_is_not_stale(self):
        analysis = Analysis(
            status="running",
            updated_at=datetime.utcnow() - timedelta(seconds=30),
        )

        self.assertFalse(_is_stale_running_analysis(analysis))

    def test_completed_analysis_is_never_stale(self):
        analysis = Analysis(
            status="completed",
            updated_at=datetime.utcnow() - timedelta(minutes=10),
        )

        self.assertFalse(_is_stale_running_analysis(analysis))


if __name__ == "__main__":
    unittest.main()
