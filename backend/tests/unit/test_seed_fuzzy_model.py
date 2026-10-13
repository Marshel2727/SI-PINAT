import unittest
from unittest.mock import patch

from sqlalchemy import Column, Integer, MetaData, String, Table, create_engine, delete, update
from fastapi import HTTPException
from sqlalchemy.sql.sqltypes import Integer as IntegerType

from app.cli import seed_fuzzy_model
from app.fuzzy.engine import calculate
from app.repositories import store
from app.services.fuzzy_model_versions import check_model, configuration, publication_readiness, publish
from app.services.questions import listing, published_summary


class SeedFuzzyModelTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        self.addCleanup(self.engine.dispose)
        metadata = MetaData()
        names = (
            "admin_users", "specializations", "courses", "fuzzy_model_versions", "course_weights",
            "grade_conversions", "fuzzy_variables", "fuzzy_sets", "fuzzy_rules",
            "fuzzy_validation_cases", "audit_logs",
        )
        tables = {name: store.table(name).to_metadata(metadata) for name in names}
        # SQLite requires INTEGER for auto-increment IDs; production keeps MySQL types.
        for table in tables.values():
            for column in table.columns:
                if isinstance(column.type, IntegerType):
                    column.type = Integer()
        metadata.create_all(self.engine)
        registry = patch.dict(store.TABLES, tables)
        registry.start()
        self.addCleanup(registry.stop)
        proposal = seed_fuzzy_model.load_proposal()
        with self.engine.begin() as db:
            admin_id = store.add(db, "admin_users", full_name="Seed Test", email="seed@example.invalid",
                                 password_hash="unused-in-unit-test", is_active=True)
            for code in seed_fuzzy_model.SPECIALIZATIONS:
                store.add(db, "specializations", code=code, name=code, is_active=True)
            for course in proposal["course_weights"]:
                store.add(db, "courses", code=course["code"], name=course["code"],
                          semester=int(course["code"][-3]), credits=3, is_active=True)
            for index in range(1, 4):
                store.add(db, "courses", code=f"DEMO-MK-{index}", name="Contoh",
                          semester=1, credits=3, is_active=True)
        self.user = {"id": admin_id}

    def test_complete_draft_including_zero_weight_demo_courses(self):
        with self.engine.begin() as db:
            identifier, created = seed_fuzzy_model.seed(db, self.user)
            self.assertTrue(created)
            config, errors = check_model(db, identifier)
            self.assertEqual(errors, [])
            self.assertEqual(config["status"], "DRAFT")
            for key, count in (("variables", 3), ("sets", 9), ("rules", 27),
                               ("validation_cases", 30), ("course_weights", 105), ("grade_conversions", 5)):
                self.assertEqual(len(config[key]), count)
            for case in config["validation_cases"]:
                self.assertIsNone(case["last_passed"])
                self.assertIsNone(case["last_tested_at"])
            demo_ids = {course["id"] for course in store.rows(db, "courses") if course["code"].startswith("DEMO")}
            for weight in config["course_weights"]:
                if weight["course_id"] in demo_ids:
                    self.assertEqual(weight["weight"], 0)
                    self.assertFalse(weight["is_required"])

    def test_all_seeded_cases_match_engine(self):
        with self.engine.begin() as db:
            identifier, _ = seed_fuzzy_model.seed(db, self.user)
            config = configuration(db, identifier)
            for case in config["validation_cases"]:
                local = {**config, "rules": [rule for rule in config["rules"]
                                             if rule["specialization_id"] == case["specialization_id"]]}
                result = calculate(float(case["academic_input"]), float(case["competency_input"]), local)
                self.assertGreaterEqual(result["score"], float(case["expected_min"]))
                self.assertLessEqual(result["score"], float(case["expected_max"]))

    def test_repeat_preserves_existing_configuration(self):
        with self.engine.begin() as db:
            identifier, _ = seed_fuzzy_model.seed(db, self.user)
            store.change(db, "fuzzy_model_versions", identifier, sampling_step=0.2)
            self.assertEqual(seed_fuzzy_model.seed(db, self.user), (identifier, False))
            self.assertAlmostEqual(float(store.one(db, "fuzzy_model_versions", id=identifier)["sampling_step"]), 0.2)
            self.assertEqual(len(store.rows(db, "fuzzy_model_versions")), 1)
            self.assertEqual(len(store.rows(db, "audit_logs")), 1)

    def test_missing_master_leaves_no_partial_model(self):
        with self.engine.begin() as db:
            db.execute(delete(store.table("courses")).where(store.table("courses").c.code == "21B01C408"))
        with self.assertRaisesRegex(ValueError, "21B01C408"):
            with self.engine.begin() as db:
                seed_fuzzy_model.seed(db, self.user)
        with self.engine.connect() as db:
            self.assertEqual(store.rows(db, "fuzzy_model_versions"), [])
            self.assertEqual(store.rows(db, "course_weights"), [])

    def test_readiness_and_publish_share_guards_and_unique_question_quota(self):
        questions = Table("questions", MetaData(), Column("id", Integer, primary_key=True),
                          Column("specialization_id", Integer), Column("code", String),
                          Column("revision", Integer), Column("status", String), Column("prompt", String))
        questions.create(self.engine)
        with patch.dict(store.TABLES, {"questions": questions}), self.engine.begin() as db:
            identifier, _ = seed_fuzzy_model.seed(db, self.user)
            self.assertFalse(publication_readiness(db, identifier)["ready"])
            with self.assertRaises(HTTPException) as blocked:
                publish(db, identifier, True, self.user)
            self.assertEqual(blocked.exception.status_code, 422)
            for spec in store.rows(db, "specializations"):
                for index in range(10):
                    store.add(db, "questions", specialization_id=spec["id"], code=f"{spec['code']}-{index}",
                              revision=1, status="PUBLISHED", prompt="Sensor 100% ready" if index == 0 else "Sensor biasa")
                store.add(db, "questions", specialization_id=spec["id"], code=f"{spec['code']}-0",
                          revision=2, status="PUBLISHED", prompt="Revisi sensor")
            self.assertTrue(all(item["published_count"] == 10 for item in published_summary(db)))
            spec_id = store.rows(db, "specializations")[0]["id"]
            self.assertEqual(len(listing(db, "PUBLISHED", spec_id, "100%")), 1)
            self.assertFalse(publication_readiness(db, identifier)["ready"])
            db.execute(update(store.table("fuzzy_validation_cases")).values(last_passed=True, last_tested_at=store.now()))
            self.assertTrue(publication_readiness(db, identifier)["ready"])
            with self.assertRaises(HTTPException):
                publish(db, identifier, False, self.user)
            self.assertEqual(publish(db, identifier, True, self.user)["status"], "PUBLISHED")


if __name__ == "__main__":
    unittest.main()
