import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.ai_pipeline import (  # noqa: E402
    _aggregate_results,
    _count_present_required_sections,
    _compute_weighted_score,
    detect_vague_patterns,
)


class TestAIPipelineHelpers(unittest.TestCase):
    def test_detect_vague_patterns_finds_common_phrases(self):
        text = "Необходимо улучшить качество сервиса и выполнить внедрение в разумные сроки."
        found = detect_vague_patterns(text)

        self.assertIn("улучшить качество", found)
        self.assertIn("в разумные сроки", found)

    def test_compute_weighted_score_maps_bounds_to_0_and_100(self):
        low = _compute_weighted_score(
            {
                "structural_completeness": 1,
                "measurability": 1,
                "logical_consistency": 1,
                "kpi_quality": 1,
            }
        )
        high = _compute_weighted_score(
            {
                "structural_completeness": 5,
                "measurability": 5,
                "logical_consistency": 5,
                "kpi_quality": 5,
            }
        )

        self.assertEqual(low, 0)
        self.assertEqual(high, 100)

    def test_count_present_required_sections_counts_only_required_types(self):
        sections = [
            {"type": "purpose"},
            {"type": "tasks"},
            {"type": "kpi"},
            {"type": "background"},
            {"type": "expected_results"},
        ]

        self.assertEqual(_count_present_required_sections(sections), 4)

    def test_aggregate_results_adds_missing_section_recommendations(self):
        structure = {
            "sections": [
                {"id": "s1", "title": "Цель проекта", "type": "purpose"},
            ],
            "document_summary": "Краткое описание документа.",
        }
        quality_results = [
            {
                "section_id": "s1",
                "scores": {
                    "structural_completeness": 4,
                    "measurability": 3,
                    "logical_consistency": 4,
                    "kpi_quality": 2,
                },
                "total_section_score": 65,
                "issues": [
                    {
                        "type": "missing_kpi",
                        "severity": "high",
                        "quote": "Показатели будут определены позднее.",
                        "explanation": "Нет измеримых KPI.",
                        "suggestion": "Добавить 2-3 измеримых показателя.",
                    }
                ],
            }
        ]
        consistency = {
            "contradictions": [],
            "consistency_score": 80,
            "overall_coherence": "Документ в целом логичен.",
        }

        result = _aggregate_results(structure, quality_results, consistency, ["kpi", "timeline"])

        self.assertEqual(result["missing_sections"], ["kpi", "timeline"])
        self.assertEqual(result["document_summary"], "Краткое описание документа.")
        self.assertEqual(result["consistency_score"], 80)
        self.assertTrue(any(rec["issue_type"] == "missing_section" for rec in result["recommendations"]))
        self.assertEqual(result["issues"][0]["section_title"], "Цель проекта")

    def test_aggregate_results_rewards_good_coverage_and_quality(self):
        structure = {
            "sections": [
                {"id": "s1", "title": "Цель", "type": "purpose"},
                {"id": "s2", "title": "Задачи", "type": "tasks"},
                {"id": "s3", "title": "KPI", "type": "kpi"},
                {"id": "s4", "title": "Сроки", "type": "timeline"},
                {"id": "s5", "title": "Ресурсы", "type": "resources"},
                {"id": "s6", "title": "Результаты", "type": "expected_results"},
            ],
            "document_summary": "Сильный документ с полным набором разделов.",
        }
        quality_results = []
        for section_id in ["s1", "s2", "s3", "s4", "s5", "s6"]:
            quality_results.append(
                {
                    "section_id": section_id,
                    "scores": {
                        "structural_completeness": 4,
                        "measurability": 4,
                        "logical_consistency": 4,
                        "kpi_quality": 4,
                    },
                    "total_section_score": 75,
                    "issues": [],
                }
            )

        consistency = {
            "contradictions": [],
            "consistency_score": 90,
            "overall_coherence": "Документ логически согласован.",
        }

        result = _aggregate_results(structure, quality_results, consistency, [])

        self.assertGreaterEqual(result["score"], 75)
        self.assertEqual(result["missing_sections"], [])

    def test_aggregate_results_applies_guardrail_for_good_documents(self):
        structure = {
            "sections": [
                {"id": "s1", "title": "Цель", "type": "purpose"},
                {"id": "s2", "title": "Задачи", "type": "tasks"},
                {"id": "s3", "title": "KPI", "type": "kpi"},
                {"id": "s4", "title": "Сроки", "type": "timeline"},
                {"id": "s5", "title": "Ресурсы", "type": "resources"},
                {"id": "s6", "title": "Результаты", "type": "expected_results"},
            ],
            "document_summary": "Хороший документ с полным покрытием.",
        }
        quality_results = []
        for section_id in ["s1", "s2", "s3", "s4", "s5", "s6"]:
            quality_results.append(
                {
                    "section_id": section_id,
                    "scores": {
                        "structural_completeness": 4,
                        "measurability": 4,
                        "logical_consistency": 4,
                        "kpi_quality": 3.5,
                    },
                    "total_section_score": 72,
                    "issues": [
                        {
                            "type": "vague_formulation",
                            "severity": "medium",
                            "quote": "Тестовая цитата",
                            "explanation": "Есть замечание, но документ в целом сильный.",
                            "suggestion": "Уточнить формулировку.",
                        }
                    ],
                }
            )

        consistency = {
            "contradictions": [],
            "consistency_score": 88,
            "overall_coherence": "Документ логически согласован.",
        }

        result = _aggregate_results(structure, quality_results, consistency, [])

        self.assertGreaterEqual(result["score"], 70)


if __name__ == "__main__":
    unittest.main()
