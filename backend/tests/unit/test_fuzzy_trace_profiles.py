import unittest
import importlib.util
from pathlib import Path
from types import ModuleType
from unittest.mock import patch

from sqlalchemy import Column, Integer, JSON, MetaData, Numeric, String, Table, create_engine

from app.repositories import store


class TraceProfileTests(unittest.TestCase):
    def test_graph_uses_assessment_model_and_preserves_stored_trace(self):
        metadata = MetaData()
        variables = Table("fuzzy_variables", metadata,
                          Column("id", Integer, primary_key=True), Column("model_version_id", Integer), Column("code", String))
        sets = Table("fuzzy_sets", metadata, Column("id", Integer, primary_key=True),
                     Column("variable_id", Integer), Column("code", String), Column("shape", String),
                     *[Column("point_" + key, Numeric) for key in "abcd"])
        traces = Table("fuzzy_traces", metadata, Column("score_id", Integer, primary_key=True), Column("memberships", JSON))
        engine = create_engine("sqlite:///:memory:")
        self.addCleanup(engine.dispose)
        metadata.create_all(engine)
        with patch.dict(store.TABLES, {table.name: table for table in (variables, sets, traces)}):
            with engine.begin() as db:
                for version, endpoint in ((10, 40), (20, 60)):
                    variable_id = store.add(db, "fuzzy_variables", model_version_id=version, code="ACADEMIC")
                    store.add(db, "fuzzy_sets", variable_id=variable_id, code="LOW", shape="TRAPEZOID",
                              point_a=0, point_b=0, point_c=20, point_d=endpoint)
                store.add(db, "fuzzy_traces", score_id=1, memberships={"ACADEMIC": {"crisp": 30, "degrees": {"LOW": 0.5}}})
                result = {"scores": [{"id": 1, "specialization_code": "ES-01"}],
                          "model_version": "PINNED-10", "engine_version": "1.0.0", "mode": "DEMO"}
                # Isolate the already-tested result service from export/auth dependencies.
                result_service = ModuleType("app.services.recommendation_scores")
                result_service.result = lambda *_: result
                path = Path(__file__).resolve().parents[2] / "app/services/fuzzy_traces.py"
                spec = importlib.util.spec_from_file_location("trace_profiles_under_test", path)
                module = importlib.util.module_from_spec(spec)
                with patch.dict("sys.modules", {"app.services.recommendation_scores": result_service}):
                    spec.loader.exec_module(module)
                    response = module.trace(db, {"model_version_id": 10}, "ES-01")
                self.assertEqual(response["input_sets"]["ACADEMIC"][0]["point_d"], 40)
                self.assertEqual(response["memberships"]["ACADEMIC"]["degrees"]["LOW"], 0.5)
                self.assertEqual(response["model_version"], "PINNED-10")
                self.assertNotIn("id", response["input_sets"]["ACADEMIC"][0])
