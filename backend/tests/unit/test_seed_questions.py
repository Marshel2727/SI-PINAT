import unittest
from unittest.mock import patch

from sqlalchemy import Boolean, Column, Integer, JSON, MetaData, String, Table, create_engine, func, select

from app.cli import seed_questions
from app.repositories import store


class SeedQuestionsTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        self.addCleanup(self.engine.dispose)
        metadata = MetaData()
        definitions = {
            "specializations": [Column("code", String), Column("is_active", Boolean)],
            "questions": [
                Column("specialization_id", Integer), Column("code", String),
                Column("revision", Integer), Column("prompt", String),
                Column("explanation", String), Column("status", String),
            ],
            "question_options": [
                Column("question_id", Integer), Column("label", String),
                Column("option_text", String), Column("is_correct", Boolean),
            ],
            "audit_logs": [
                Column("admin_id", Integer), Column("action", String),
                Column("entity_table", String), Column("entity_id", Integer),
                Column("before_data", JSON), Column("after_data", JSON),
            ],
        }
        tables = {
            name: Table(name, metadata, Column("id", Integer, primary_key=True), *columns)
            for name, columns in definitions.items()
        }
        metadata.create_all(self.engine)
        registry = patch.dict(store.TABLES, tables)
        registry.start()
        self.addCleanup(registry.stop)
        with self.engine.begin() as db:
            for code in seed_questions.SPECIALIZATIONS:
                store.add(db, "specializations", code=code, is_active=True)
        self.user = {"id": 1}

    def test_imports_referenced_drafts_with_exactly_one_key(self):
        with self.engine.begin() as db:
            self.assertEqual(seed_questions.seed(db, self.user), (30, 0))
            questions = store.rows(db, "questions")
            self.assertEqual(len(questions), 30)
            self.assertEqual(len(store.rows(db, "question_options")), 120)
            self.assertEqual(len(store.rows(db, "audit_logs")), 30)
            for question in questions:
                self.assertEqual(question["status"], "DRAFT")
                self.assertIn("https://", question["explanation"])
                options = store.rows(db, "question_options", question_id=question["id"])
                self.assertEqual({option["label"] for option in options}, set("ABCD"))
                self.assertEqual(sum(option["is_correct"] for option in options), 1)

    def test_repeat_preserves_admin_edits_and_later_revisions(self):
        with self.engine.begin() as db:
            seed_questions.seed(db, self.user)
            question = store.rows(db, "questions")[0]
            store.change(db, "questions", question["id"], prompt="Sudah ditinjau admin", status="PUBLISHED")
            store.add(db, "questions", specialization_id=question["specialization_id"],
                      code=question["code"], revision=2, prompt="Revisi admin", status="DRAFT")
            self.assertEqual(seed_questions.seed(db, self.user), (0, 30))
            self.assertEqual(store.one(db, "questions", id=question["id"])["prompt"], "Sudah ditinjau admin")
            self.assertEqual(len(store.rows(db, "questions")), 31)
            self.assertEqual(len(store.rows(db, "question_options")), 120)
            self.assertEqual(len(store.rows(db, "audit_logs")), 30)

    def test_failed_option_insert_rolls_back_entire_import(self):
        original_add = seed_questions.add
        calls = 0

        def fail_during_options(db, table_name, **values):
            nonlocal calls
            calls += 1
            if calls == 8:
                raise RuntimeError("Simulated option insert failure")
            return original_add(db, table_name, **values)

        with self.assertRaises(RuntimeError):
            with self.engine.begin() as db, patch.object(seed_questions, "add", side_effect=fail_during_options):
                seed_questions.seed(db, self.user)
        with self.engine.connect() as db:
            for name in ("questions", "question_options", "audit_logs"):
                self.assertEqual(db.scalar(select(func.count()).select_from(store.table(name))), 0)


if __name__ == "__main__":
    unittest.main()
