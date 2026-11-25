import importlib
import importlib.util
import os
import sys
import tempfile
import types
import unittest
from datetime import datetime
from unittest.mock import patch

os.environ.setdefault("APP_SECRET", "unit-test-only-secret-at-least-32-characters")
os.environ.setdefault("DB_PASSWORD", "unit-test-no-live-database")
os.environ.setdefault("PUBLIC_ORIGIN", "http://testserver")

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import Integer, MetaData, create_engine
from sqlalchemy.sql.sqltypes import Integer as IntegerType

from app.core.config import settings
from app.repositories import store
from app.schemas.inputs import BoundarySeed, Profile, QuestionImport


def _install_optional_stubs():
    """Provide lightweight stubs only when optional third-party packages are absent locally."""
    patches = []
    if importlib.util.find_spec("argon2") is None:
        argon2_mod = types.ModuleType("argon2")
        argon2_mod.PasswordHasher = lambda: object()
        exc_mod = types.ModuleType("argon2.exceptions")
        exc_mod.VerificationError = Exception
        patches.append(patch.dict(
            sys.modules,
            {"argon2": argon2_mod, "argon2.exceptions": exc_mod},
        ))
    if importlib.util.find_spec("openpyxl") is None:
        openpyxl_mod = types.ModuleType("openpyxl")
        openpyxl_mod.Workbook = object
        openpyxl_mod.load_workbook = lambda *args, **kwargs: None
        patches.append(patch.dict(sys.modules, {"openpyxl": openpyxl_mod}))
    if importlib.util.find_spec("reportlab") is None:
        reportlab_mod = types.ModuleType("reportlab")
        lib_mod = types.ModuleType("reportlab.lib")
        colors_mod = types.ModuleType("reportlab.lib.colors")
        colors_mod.HexColor = lambda value: value
        colors_mod.lightgrey = "#D3D3D3"
        styles_mod = types.ModuleType("reportlab.lib.styles")
        styles_mod.getSampleStyleSheet = lambda: {"Title": "Title", "Normal": "Normal"}
        platypus_mod = types.ModuleType("reportlab.platypus")

        class FakeParagraph:
            def __init__(self, text, style=None):
                self.text = text
                self.style = style

        class FakeSpacer:
            def __init__(self, width, height):
                self.width = width
                self.height = height

        class FakeTable:
            def __init__(self, data, colWidths=None, repeatRows=1):
                self.data = data

            def setStyle(self, style):
                self.style = style

        class FakeTableStyle:
            def __init__(self, commands):
                self.commands = commands

        class FakeDoc:
            def __init__(self, output, title="", author=""):
                self.output = output

            def build(self, story):
                lines = [getattr(item, "text", "") for item in story if hasattr(item, "text")]
                self.output.write(b"%PDF-1.4\n" + "\n".join(lines).encode("utf-8"))

        platypus_mod.SimpleDocTemplate = FakeDoc
        platypus_mod.Paragraph = FakeParagraph
        platypus_mod.Spacer = FakeSpacer
        platypus_mod.Table = FakeTable
        platypus_mod.TableStyle = FakeTableStyle
        lib_mod.colors = colors_mod
        lib_mod.styles = styles_mod
        reportlab_mod.lib = lib_mod
        reportlab_mod.platypus = platypus_mod
        patches.append(
            patch.dict(
            sys.modules,
            {
            "reportlab": reportlab_mod,
            "reportlab.lib": lib_mod,
            "reportlab.lib.colors": colors_mod,
            "reportlab.lib.styles": styles_mod,
            "reportlab.platypus": platypus_mod,
            },
            )
        )
    return patches


class BackendFixesUnitTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        self.addCleanup(self.engine.dispose)

        metadata = MetaData()
        tables = {}
        for name, tbl in store.TABLES.items():
            copied = tbl.to_metadata(metadata)
            for column in copied.columns:
                if isinstance(column.type, IntegerType):
                    column.type = Integer()
            tables[name] = copied
        metadata.create_all(self.engine)

        table_patch = patch.dict(store.TABLES, tables)
        table_patch.start()
        self.addCleanup(table_patch.stop)

        for stub_patch in _install_optional_stubs():
            stub_patch.start()
            self.addCleanup(stub_patch.stop)

        self.assessment_grades = importlib.import_module("app.services.assessment_grades")
        self.audit_logs = importlib.import_module("app.services.audit_logs")
        self.courses = importlib.import_module("app.services.courses")
        self.fuzzy_model_versions = importlib.import_module("app.services.fuzzy_model_versions")
        self.fuzzy_validation_cases = importlib.import_module("app.services.fuzzy_validation_cases")
        self.grade_conversions = importlib.import_module("app.services.grade_conversions")
        self.questions = importlib.import_module("app.services.questions")
        self.recommendation_scores = importlib.import_module("app.services.recommendation_scores")
        self.students = importlib.import_module("app.services.students")
        self.transcript_imports = importlib.import_module("app.services.transcript_imports")

        with self.engine.begin() as db:
            self.admin_id = store.add(
                db,
                "admin_users",
                full_name="Admin Penguji",
                email="admin@sipinat.test",
                password_hash="unused",
                is_active=True,
            )
            self.user = {
                "id": self.admin_id,
                "full_name": "Admin Penguji",
                "email": "admin@sipinat.test",
            }
            self.specs = []
            for code, name in [
                ("ES-01", "Embedded Systems"),
                ("SC-02", "Smart Computing"),
                ("JDF-03", "Jaringan dan Forensik"),
            ]:
                sid = store.add(db, "specializations", code=code, name=name, is_active=True)
                self.specs.append({"id": sid, "code": code, "name": name})

            self.c1 = store.add(
                db,
                "courses",
                code="MK101",
                name="Rangkaian Digital",
                semester=1,
                credits=3,
                is_active=True,
            )
            self.c2 = store.add(
                db,
                "courses",
                code="MK102",
                name="Pemrograman Dasar",
                semester=2,
                credits=3,
                is_active=True,
            )
            self.c_inactive = store.add(
                db,
                "courses",
                code="MK999",
                name="Mata Kuliah Lama",
                semester=1,
                credits=2,
                is_active=False,
            )

            self.pub_model_id = store.add(
                db,
                "fuzzy_model_versions",
                version_code="PUB-001",
                method="MAMDANI",
                defuzzification="CENTROID",
                sampling_step=0.1,
                status="PUBLISHED",
                created_by=self.admin_id,
                published_at=store.now(),
            )
            for letter, pts in (("A", 4), ("B", 3), ("C", 2), ("D", 1), ("E", 0)):
                store.add(
                    db,
                    "grade_conversions",
                    model_version_id=self.pub_model_id,
                    letter_grade=letter,
                    grade_points=pts,
                    normalized_score=pts * 25,
                )
            for spec in self.specs:
                store.add(
                    db,
                    "course_weights",
                    model_version_id=self.pub_model_id,
                    course_id=self.c1,
                    specialization_id=spec["id"],
                    weight=1.0,
                    is_required=True,
                )
                store.add(
                    db,
                    "course_weights",
                    model_version_id=self.pub_model_id,
                    course_id=self.c2,
                    specialization_id=spec["id"],
                    weight=0.5,
                    is_required=True,
                )

            self.draft_model_id = store.add(
                db,
                "fuzzy_model_versions",
                version_code="DRAFT-001",
                method="MAMDANI",
                defuzzification="CENTROID",
                sampling_step=0.1,
                status="DRAFT",
                created_by=self.admin_id,
            )

    def test_partial_import_preview_and_name_warning_and_confirm_rejection(self):
        with tempfile.TemporaryDirectory() as tmpdir, patch.object(settings(), "upload_dir", tmpdir):
            with self.engine.connect() as db:
                aid = store.add(
                    db,
                    "assessments",
                    public_id="11111111-1111-1111-1111-111111111111",
                    student_id=None,
                    preferred_specialization_id=None,
                    model_version_id=self.pub_model_id,
                    access_token_hash="a" * 64,
                    mode="DEMO",
                    status="DRAFT",
                    current_semester=4,
                    question_count=30,
                )
                assessment = store.one(db, "assessments", id=aid)
                self.assessment_grades.save(
                    db,
                    assessment,
                    [
                    {
                        "semester": 1,
                        "kode_mk": "MK101",
                        "nama_mk": "Rangkaian Digital",
                        "nilai_huruf": "A",
                    },
                    {
                        "semester": 2,
                        "kode_mk": "MK102",
                        "nama_mk": "Pemrograman Dasar",
                        "nilai_huruf": "B",
                    },
                    ],
                )
                db.commit()
                # Partial transcript (missing MK102 & missing preference) + minor nama_mk difference.
                partial_csv = "semester,kode_mk,nama_mk,nilai_huruf\n1,MK101,Rangkaian Digital + Lab,A\n".encode("utf-8")
                preview = self.transcript_imports.import_file(
                    db, assessment, "khs.csv", partial_csv, "text/csv", confirm=False
                )
                self.assertFalse(preview["committed"])
                self.assertFalse(preview["ready"])
                self.assertEqual(preview["missing_required"], ["MK102"])
                self.assertEqual(preview["coverage"], {"provided": 1, "available": 2})
                self.assertEqual(
                    preview["grades"][0]["course_snapshot"]["name"],
                    "Rangkaian Digital",
                )
                self.assertEqual(len(preview["warnings"]), 1)
                self.assertIn("MK101", preview["warnings"][0])
                latest_import = store.one(db, "transcript_imports", id=preview["import_id"])
                self.assertEqual(latest_import["status"], "VALID")

                # Confirm=True must still reject incomplete transcripts and preserve prior grades.
                with self.assertRaises(HTTPException) as exc:
                    self.transcript_imports.import_file(
                        db, assessment, "khs.csv", partial_csv, "text/csv", confirm=True
                    )
                self.assertEqual(exc.exception.status_code, 422)
                self.assertEqual(exc.exception.detail["code"], "IMPORT_INVALID")
                self.assertEqual(len(store.rows(db, "assessment_grades", assessment_id=aid)), 2)

                # Unknown kode_mk must still reject even when confirm=False.
                bad_code_csv = "semester,kode_mk,nama_mk,nilai_huruf\n1,UNKNOWN,X,A\n".encode("utf-8")
                with self.assertRaises(HTTPException) as bad_exc:
                    self.transcript_imports.import_file(
                        db, assessment, "bad.csv", bad_code_csv, "text/csv", confirm=False
                    )
                self.assertEqual(bad_exc.exception.status_code, 422)

                # Bad CSV header must still reject with 422.
                with self.assertRaises(HTTPException) as header_exc:
                    self.transcript_imports.import_file(
                        db, assessment, "bad.csv", b"bad,header\n1,2", "text/csv", confirm=False
                    )
                self.assertEqual(header_exc.exception.status_code, 422)

    def test_result_search_and_pdf_report_identity_and_formatting(self):
        with self.engine.begin() as db:
            sid = store.add(
                db,
                "students",
                nim="220999",
                full_name="Budi Santoso",
                class_name="TEKOM-A",
            )
            completed_at = datetime(2026, 3, 15, 9, 5)
            full_id = store.add(
                db,
                "assessments",
                public_id="aaaa1111-0000-0000-0000-000000000001",
                student_id=sid,
                preferred_specialization_id=self.specs[0]["id"],
                model_version_id=self.pub_model_id,
                access_token_hash="b" * 64,
                mode="FULL",
                status="COMPLETED",
                current_semester=4,
                question_count=3,
                completed_at=completed_at,
            )
            demo_id = store.add(
                db,
                "assessments",
                public_id="bbbb2222-0000-0000-0000-000000000002",
                student_id=None,
                preferred_specialization_id=self.specs[1]["id"],
                model_version_id=self.pub_model_id,
                access_token_hash="c" * 64,
                mode="DEMO",
                status="COMPLETED",
                current_semester=3,
                question_count=3,
                completed_at=completed_at,
            )
            for aid, ans_sources in [
                (full_id, ("USER", "USER", "USER")),
                (demo_id, ("USER", "EXAMPLE", "EXAMPLE")),
            ]:
                run_id = store.add(
                    db,
                    "recommendation_runs",
                    assessment_id=aid,
                    model_version_id=self.pub_model_id,
                    engine_version="1.0.0",
                    status="SUCCESS",
                    calculated_at=completed_at,
                )
                for idx, (spec, src) in enumerate(zip(self.specs, ans_sources), 1):
                    qid = store.add(
                        db,
                        "questions",
                        specialization_id=spec["id"],
                        code=f"Q-{aid}-{idx}",
                        revision=1,
                        prompt="Prompt",
                        status="PUBLISHED",
                    )
                    oid = store.add(
                        db,
                        "question_options",
                        question_id=qid,
                        label="A",
                        option_text="Opt",
                        is_correct=True,
                    )
                    item_id = store.add(
                        db,
                        "assessment_items",
                        assessment_id=aid,
                        question_id=qid,
                        order_no=idx,
                        max_points=1,
                    )
                    store.add(
                        db,
                        "assessment_answers",
                        assessment_item_id=item_id,
                        question_id=qid,
                        option_id=oid,
                        awarded_points=1,
                        answer_source=src,
                        answered_at=completed_at,
                    )
                    store.add(
                        db,
                        "recommendation_scores",
                        run_id=run_id,
                        specialization_id=spec["id"],
                        academic_score=80,
                        competency_score=90 if idx == 1 else 60,
                        suitability_score=85 if idx == 1 else 60,
                        rank_position=1 if idx == 1 else idx,
                        reason="Ringkasan uji.",
                    )

            full_res = self.recommendation_scores.result(db, store.one(db, "assessments", id=full_id))
            self.assertEqual(full_res["student"]["nim"], "220999")
            self.assertEqual(full_res["current_semester"], 4)

            demo_res = self.recommendation_scores.result(db, store.one(db, "assessments", id=demo_id))
            self.assertIsNone(demo_res["student"])
            self.assertEqual(demo_res["current_semester"], 3)

            # Case-insensitive search across public_id, nim, and full_name.
            rows_nim, total_nim = self.recommendation_scores.listing(db, search="220999")
            self.assertEqual(total_nim, 1)
            self.assertEqual(rows_nim[0]["id"], full_id)

            rows_name, total_name = self.recommendation_scores.listing(db, search="budi santoso")
            self.assertEqual(total_name, 1)
            self.assertEqual(rows_name[0]["id"], full_id)

            rows_pub, total_pub = self.recommendation_scores.listing(db, search="BBBB2222")
            self.assertEqual(total_pub, 1)
            self.assertEqual(rows_pub[0]["id"], demo_id)

            # Dashboard stats intact when search omitted.
            dash = self.recommendation_scores.dashboard(db)
            self.assertEqual(dash["total_assessments"], 2)
            self.assertEqual(dash["completed"], 2)

            # Verify PDF rendered text for both FULL and DEMO.
            captured = []
            orig_paragraph = self.recommendation_scores.Paragraph

            def capture_paragraph(text, *args, **kwargs):
                captured.append(text)
                return orig_paragraph(text, *args, **kwargs)

            with patch.object(
                self.recommendation_scores,
                "Paragraph",
                side_effect=capture_paragraph,
            ):
                full_pdf = self.recommendation_scores.report_pdf(db, store.one(db, "assessments", id=full_id))
                self.assertTrue(full_pdf.startswith(b"%PDF"))
                joined_full = "\n".join(captured)
                self.assertIn("Budi Santoso", joined_full)
                self.assertIn("220999", joined_full)
                self.assertIn("TEKOM-A", joined_full)
                self.assertIn("Semester: 4", joined_full)
                self.assertIn("2026-03-15 09:05 UTC", joined_full)
                self.assertIn("3 jawaban mandiri, 0 jawaban contoh", joined_full)
                self.assertIn("Embedded Systems (ES-01)", joined_full)

                captured.clear()
                demo_pdf = self.recommendation_scores.report_pdf(db, store.one(db, "assessments", id=demo_id))
                self.assertTrue(demo_pdf.startswith(b"%PDF"))
                joined_demo = "\n".join(captured)
                self.assertIn("Peserta DEMO (Simulasi)", joined_demo)
                self.assertIn("Semester: 3", joined_demo)
                self.assertIn("1 jawaban mandiri, 2 jawaban contoh", joined_demo)

    def test_delete_validation_case_on_draft(self):
        with self.engine.begin() as db:
            c1 = store.add(
                db,
                "fuzzy_validation_cases",
                model_version_id=self.draft_model_id,
                specialization_id=self.specs[0]["id"],
                case_code="C-1",
                academic_input=50,
                competency_input=50,
                expected_min=45,
                expected_max=55,
                last_actual_score=50,
                last_passed=True,
                last_tested_at=store.now(),
            )
            c2 = store.add(
                db,
                "fuzzy_validation_cases",
                model_version_id=self.draft_model_id,
                specialization_id=self.specs[0]["id"],
                case_code="C-2",
                academic_input=0,
                competency_input=0,
                expected_min=10,
                expected_max=20,
                last_actual_score=15,
                last_passed=True,
                last_tested_at=store.now(),
            )
            pub_case = store.add(
                db,
                "fuzzy_validation_cases",
                model_version_id=self.pub_model_id,
                specialization_id=self.specs[0]["id"],
                case_code="C-PUB",
                academic_input=0,
                competency_input=0,
                expected_min=10,
                expected_max=20,
            )

            res = self.fuzzy_validation_cases.remove(db, self.draft_model_id, c1, self.user)
            self.assertEqual(res, {"deleted": True, "id": c1})
            self.assertIsNone(store.one(db, "fuzzy_validation_cases", id=c1))
            # Remaining case must be invalidated.
            remaining = store.one(db, "fuzzy_validation_cases", id=c2)
            self.assertIsNone(remaining["last_passed"])
            self.assertIsNone(remaining["last_tested_at"])
            # Audit log recorded.
            delete_logs = store.rows(
                db,
                "audit_logs",
                action="DELETE",
                entity_table="fuzzy_validation_cases",
            )
            self.assertEqual(len(delete_logs), 1)
            self.assertEqual(delete_logs[0]["entity_id"], c1)

            with self.assertRaises(HTTPException) as not_found:
                self.fuzzy_validation_cases.remove(db, self.draft_model_id, c1, self.user)
            self.assertEqual(not_found.exception.status_code, 404)

            with self.assertRaises(HTTPException) as immutable:
                self.fuzzy_validation_cases.remove(db, self.pub_model_id, pub_case, self.user)
            self.assertEqual(immutable.exception.status_code, 409)

    def test_question_latest_revision_delete_draft_and_bulk_import(self):
        with self.engine.begin() as db:
            q1_r1 = store.add(
                db,
                "questions",
                specialization_id=self.specs[0]["id"],
                code="ES-Q1",
                revision=1,
                prompt="Old rev",
                status="ARCHIVED",
            )
            q1_r2 = store.add(
                db,
                "questions",
                specialization_id=self.specs[0]["id"],
                code="ES-Q1",
                revision=2,
                prompt="New rev",
                status="PUBLISHED",
            )
            q2_r1 = store.add(
                db,
                "questions",
                specialization_id=self.specs[0]["id"],
                code="ES-Q2",
                revision=1,
                prompt="Archived latest",
                status="ARCHIVED",
            )
            # Even when filtered to ARCHIVED only, ES-Q1 r1 must have is_latest_revision=False!
            archived = {row["id"]: row for row in self.questions.listing(db, status="ARCHIVED")}
            self.assertFalse(archived[q1_r1]["is_latest_revision"])
            self.assertTrue(archived[q2_r1]["is_latest_revision"])

            # Published question cannot be deleted.
            with self.assertRaises(HTTPException) as conflict:
                self.questions.remove(db, q1_r2, self.user)
            self.assertEqual(conflict.exception.status_code, 409)

            # Bulk import schema validation & execution.
            with self.assertRaises(ValidationError):
                QuestionImport(questions=[], publish=False)

            payload = QuestionImport(
                questions=[
                {
                "specialization_id": self.specs[0]["id"],
                "code": "BULK-1",
                "prompt": "Soal bulk 1",
                "options": [
                {"label": "A", "option_text": "Benar", "is_correct": True},
                {"label": "B", "option_text": "Salah", "is_correct": False},
                ],
                },
                {
                "specialization_id": self.specs[1]["id"],
                "code": "BULK-2",
                "prompt": "Soal bulk 2",
                "options": [
                {"label": "A", "option_text": "Salah", "is_correct": False},
                {"label": "B", "option_text": "Benar", "is_correct": True},
                ],
                },
                ],
                publish=False,
            )
            imported = self.questions.bulk_import(
                db,
                [q.model_dump() for q in payload.questions],
                payload.publish,
                self.user,
            )
            self.assertEqual(len(imported["created"]), 2)
            self.assertEqual(imported["published_count"], 0)
            self.assertEqual(imported["errors"], [])

            # Delete created DRAFT question removes options first and audits DELETE.
            draft_id = imported["created"][0]["id"]
            deleted = self.questions.remove(db, draft_id, self.user)
            self.assertEqual(deleted, {"deleted": True, "id": draft_id})
            self.assertEqual(store.rows(db, "question_options", question_id=draft_id), [])
            self.assertIsNone(store.one(db, "questions", id=draft_id))

            # Publish=True + per-item invalid specialization error handling.
            imported_pub = self.questions.bulk_import(
                db,
                [
                payload.questions[1].model_dump(),
                {
                    **payload.questions[0].model_dump(),
                    "specialization_id": 999999,
                    "code": "BAD-SPEC",
                },
                ],
                True,
                self.user,
            )
            self.assertEqual(len(imported_pub["created"]), 1)
            self.assertEqual(imported_pub["published_count"], 1)
            self.assertEqual(imported_pub["created"][0]["status"], "PUBLISHED")
            self.assertEqual(len(imported_pub["errors"]), 1)
            self.assertEqual(imported_pub["errors"][0]["code"], "BAD-SPEC")

    def test_courses_filter_lock_flag_and_audit_logs_enrichment(self):
        with self.engine.begin() as db:
            c_draft_only = store.add(
                db,
                "courses",
                code="MK201",
                name="Draft Weighted",
                semester=3,
                credits=3,
                is_active=True,
            )
            store.add(
                db,
                "course_weights",
                model_version_id=self.draft_model_id,
                course_id=c_draft_only,
                specialization_id=self.specs[0]["id"],
                weight=0.5,
                is_required=False,
            )

            active_rows = self.courses.listing(db, is_active=True)
            by_code = {row["code"]: row for row in active_rows}
            self.assertNotIn("MK999", by_code)
            self.assertTrue(by_code["MK101"]["is_locked_by_published"])
            self.assertFalse(by_code["MK201"]["is_locked_by_published"])

            inactive_rows = self.courses.listing(db, is_active=False)
            self.assertEqual([r["code"] for r in inactive_rows], ["MK999"])

            saved_course = self.courses.save(
                db,
                {"code": "MK301", "name": "Baru", "semester": 4, "credits": 2, "is_active": True},
                self.user,
            )
            self.assertFalse(saved_course["is_locked_by_published"])

            # Audit log filtering + admin enrichment + excluding rate_limit.
            store.add(db, "audit_logs", action="login:xyz", entity_table="rate_limit")
            store.audit(db, None, "SYSTEM_JOB", "courses", c_draft_only)
            all_logs, total = self.audit_logs.listing(db, page=1, page_size=20)
            self.assertEqual(total, 2)
            self.assertTrue(all(row["entity_table"] != "rate_limit" for row in all_logs))
            filtered_logs, filtered_total = self.audit_logs.listing(
                db, page=1, page_size=20, entity_table="courses", action="CREATE"
            )
            self.assertEqual(filtered_total, 1)
            self.assertEqual(filtered_logs[0]["admin_name"], "Admin Penguji")
            self.assertEqual(filtered_logs[0]["admin_email"], "admin@sipinat.test")

    def test_scaffold_defaults_and_student_identity_copy(self):
        with self.engine.begin() as db:
        # Scaffold on DRAFT model populates defaults cleanly.
            scaffolded = self.fuzzy_model_versions.scaffold_defaults(db, self.draft_model_id, self.user)
            self.assertEqual(len(scaffolded["grade_conversions"]), 12)
            self.assertEqual(
                [c["letter_grade"] for c in scaffolded["grade_conversions"]],
                ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"],
            )
            self.assertEqual(len(scaffolded["course_weights"]), 2 * 3)  # 2 active courses * 3 active specs
            self.assertEqual(len(scaffolded["variables"]), 3)
            self.assertEqual(len(scaffolded["sets"]), 9)
            self.assertEqual(len(scaffolded["rules"]), 27)

            # Calling again is idempotent and does not duplicate rows.
            again = self.fuzzy_model_versions.scaffold_defaults(db, self.draft_model_id, self.user)
            self.assertEqual(len(again["rules"]), 27)
            self.assertEqual(len(again["sets"]), 9)

            # After setting positive weights, check_model passes with zero errors.
            for row in store.rows(db, "course_weights", model_version_id=self.draft_model_id):
                store.change(db, "course_weights", row["id"], weight=1.0)
            _, errors = self.fuzzy_model_versions.check_model(db, self.draft_model_id)
            self.assertEqual(errors, [])

            # Cannot scaffold a PUBLISHED model.
            with self.assertRaises(HTTPException) as locked_err:
                self.fuzzy_model_versions.scaffold_defaults(db, self.pub_model_id, self.user)
            self.assertEqual(locked_err.exception.status_code, 409)

            # Student identity mismatch copy does not disclose stored DB values.
            self.students.identify(
                db,
                Profile(nim="220111", full_name="Siti Rahma", class_name=None, semester=4),
            )
            with self.assertRaises(HTTPException) as mismatch:
                self.students.identify(
                    db,
                    Profile(nim="220111", full_name="Siti Rahma", class_name="B", semester=4),
                )
            self.assertEqual(mismatch.exception.status_code, 422)
            self.assertEqual(mismatch.exception.detail["code"], "IDENTITY_MISMATCH")
            self.assertIn(
                "kosongkan kelas bila sebelumnya kosong",
                mismatch.exception.detail["message"],
            )
            self.assertNotIn("Siti Rahma", mismatch.exception.detail["message"])

    def test_unm_12_grade_scale_sorting_save_and_import(self):
        expected_order = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"]
        with self.engine.begin() as db:
            # Save in scrambled order with lowercase/whitespace; verify normalization & duplicate guard.
            with self.assertRaises(HTTPException) as dup_exc:
                self.grade_conversions.save(
                    db,
                    self.draft_model_id,
                    [
                        {"letter_grade": "a-", "grade_points": 3.75, "normalized_score": 93.75},
                        {"letter_grade": " A- ", "grade_points": 3.75, "normalized_score": 93.75},
                    ],
                    self.user,
                )
            self.assertEqual(dup_exc.exception.status_code, 422)

            scrambled = [
                {"letter_grade": f" {letter.lower()} ", "grade_points": pts, "normalized_score": norm}
                for letter, pts, norm in reversed(self.grade_conversions.UNM_GRADE_CONVERSIONS)
            ]
            saved_cfg = self.grade_conversions.save(db, self.draft_model_id, scrambled, self.user)
            self.assertEqual(
                [c["letter_grade"] for c in saved_cfg["grade_conversions"]],
                expected_order,
            )
            self.assertEqual(
                [c["letter_grade"] for c in self.grade_conversions.listing(db, self.draft_model_id)],
                expected_order,
            )

            # Publish a 12-level model and verify assessment_grades.check + for_assessment accept A-/B+/C-/D+.
            for course_id in (self.c1, self.c2):
                for spec in self.specs:
                    store.add(
                        db,
                        "course_weights",
                        model_version_id=self.draft_model_id,
                        course_id=course_id,
                        specialization_id=spec["id"],
                        weight=1.0,
                        is_required=True,
                    )
            store.change(db, "fuzzy_model_versions", self.draft_model_id, status="PUBLISHED", published_at=store.now())
            aid = store.add(
                db,
                "assessments",
                public_id="cccc3333-0000-0000-0000-000000000003",
                student_id=None,
                preferred_specialization_id=self.specs[0]["id"],
                model_version_id=self.draft_model_id,
                access_token_hash="d" * 64,
                mode="FULL",
                status="DRAFT",
                current_semester=4,
                question_count=30,
            )
            assessment = store.one(db, "assessments", id=aid)
            master = self.courses.for_assessment(db, assessment)
            self.assertEqual([c["letter_grade"] for c in master["conversions"]], expected_order)

            for pair in (("A-", "B+"), ("C-", "D+")):
                accepted, errors = self.assessment_grades.check(
                    db,
                    assessment,
                    [
                        {"semester": 1, "kode_mk": "MK101", "nama_mk": "Rangkaian Digital", "nilai_huruf": pair[0].lower()},
                        {"semester": 2, "kode_mk": "MK102", "nama_mk": "Pemrograman Dasar", "nilai_huruf": f" {pair[1]} "},
                    ],
                )
                self.assertEqual(errors, [])
                self.assertEqual([g["letter_grade"] for g in accepted], list(pair))

    def test_publish_all_drafts_and_bulk_import_specialization_code(self):
        with self.engine.begin() as db:
            # Validation checks for QuestionImportItem specialization_id / specialization_code.
            with self.assertRaises(ValidationError):
                QuestionImport(
                    questions=[{
                        "code": "NO-SPEC",
                        "prompt": "Tanpa peminatan",
                        "options": [
                            {"label": "A", "option_text": "Ya", "is_correct": True},
                            {"label": "B", "option_text": "Tidak", "is_correct": False},
                        ],
                    }],
                )

            payload = QuestionImport(
                questions=[
                    {
                        "specialization_code": " es-01 ",
                        "code": "CODE-ES-1",
                        "prompt": "Soal ES via kode",
                        "options": [
                            {"label": "A", "option_text": "Benar", "is_correct": True},
                            {"label": "B", "option_text": "Salah", "is_correct": False},
                        ],
                    },
                    {
                        "specialization_code": "SC-02",
                        "code": "CODE-SC-1",
                        "prompt": "Soal SC via kode",
                        "options": [
                            {"label": "A", "option_text": "Salah", "is_correct": False},
                            {"label": "B", "option_text": "Benar", "is_correct": True},
                        ],
                    },
                    {
                        "specialization_code": "UNKNOWN-99",
                        "code": "BAD-CODE",
                        "prompt": "Soal peminatan tidak dikenal",
                        "options": [
                            {"label": "A", "option_text": "Ya", "is_correct": True},
                            {"label": "B", "option_text": "Tidak", "is_correct": False},
                        ],
                    },
                ],
                publish=False,
            )
            imported = self.questions.bulk_import(
                db,
                [q.model_dump() for q in payload.questions],
                payload.publish,
                self.user,
            )
            self.assertEqual(len(imported["created"]), 2)
            self.assertEqual(imported["created"][0]["specialization_id"], self.specs[0]["id"])
            self.assertEqual(imported["created"][1]["specialization_id"], self.specs[1]["id"])
            self.assertEqual(len(imported["errors"]), 1)
            self.assertEqual(imported["errors"][0]["code"], "BAD-CODE")

            # Add a newer DRAFT revision for CODE-ES-1 so rev 1 is no longer latest,
            # plus an invalid DRAFT (missing correct option).
            rev2 = self.questions.revision(db, imported["created"][0]["id"], self.user)
            broken_id = store.add(
                db,
                "questions",
                specialization_id=self.specs[2]["id"],
                code="BROKEN-DRAFT",
                revision=1,
                prompt="Tanpa opsi benar",
                status="DRAFT",
            )
            store.add(
                db,
                "question_options",
                question_id=broken_id,
                label="A",
                option_text="Salah 1",
                is_correct=False,
            )
            store.add(
                db,
                "question_options",
                question_id=broken_id,
                label="B",
                option_text="Salah 2",
                is_correct=False,
            )

            result = self.questions.publish_all_drafts(db, self.user)
            self.assertEqual(result["published_count"], 2)
            self.assertEqual(len(result["failed"]), 1)
            self.assertEqual(result["failed"][0]["id"], str(broken_id))
            self.assertEqual(result["failed"][0]["code"], "BROKEN-DRAFT")
            self.assertEqual(store.one(db, "questions", id=imported["created"][0]["id"])["status"], "DRAFT")
            self.assertEqual(store.one(db, "questions", id=rev2["id"])["status"], "PUBLISHED")
            self.assertEqual(store.one(db, "questions", id=imported["created"][1]["id"])["status"], "PUBLISHED")

    def test_seed_boundary_cases_and_validate(self):
        schema_defaults = BoundarySeed()
        self.assertEqual(schema_defaults.tolerance, 0.5)
        self.assertFalse(schema_defaults.recalculate_existing)

        with self.engine.begin() as db:
            # Incomplete draft model must reject with MODEL_INCOMPLETE.
            with self.assertRaises(HTTPException) as incomplete:
                self.fuzzy_validation_cases.seed_boundary_cases(db, self.draft_model_id, self.user)
            self.assertEqual(incomplete.exception.status_code, 422)
            self.assertEqual(incomplete.exception.detail["code"], "MODEL_INCOMPLETE")

            # Unknown specialization_id must reject with 422.
            with self.assertRaises(HTTPException) as bad_spec:
                self.fuzzy_validation_cases.seed_boundary_cases(
                    db,
                    self.draft_model_id,
                    self.user,
                    specialization_id=999999,
                )
            self.assertEqual(bad_spec.exception.status_code, 422)

            self.fuzzy_model_versions.scaffold_defaults(db, self.draft_model_id, self.user)
            for row in store.rows(db, "course_weights", model_version_id=self.draft_model_id):
                store.change(db, "course_weights", row["id"], weight=1.0)

            # Seed an existing 0..99 placeholder on ES-01 (0, 0), a custom range on SC-02 (50, 50),
            # and a colliding case_code BATAS-JDF-03-S01.
            placeholder_id = store.add(
                db,
                "fuzzy_validation_cases",
                model_version_id=self.draft_model_id,
                specialization_id=self.specs[0]["id"],
                case_code="PLACEHOLDER-01",
                academic_input=0,
                competency_input=0,
                expected_min=0,
                expected_max=99,
            )
            custom_id = store.add(
                db,
                "fuzzy_validation_cases",
                model_version_id=self.draft_model_id,
                specialization_id=self.specs[1]["id"],
                case_code="BATAS-SC-02-S02",
                academic_input=50,
                competency_input=50,
                expected_min=40,
                expected_max=60,
            )
            store.add(
                db,
                "fuzzy_validation_cases",
                model_version_id=self.draft_model_id,
                specialization_id=self.specs[2]["id"],
                case_code="BATAS-JDF-03-S01",
                academic_input=10,
                competency_input=10,
                expected_min=10,
                expected_max=30,
            )

            seeded = self.fuzzy_validation_cases.seed_boundary_cases(
                db,
                self.draft_model_id,
                self.user,
                tolerance=0.5,
                recalculate_existing=False,
            )
            # 30 boundary cases total: 2 already existed ((0,0) on ES-01 and (50,50) on SC-02), 28 created.
            self.assertEqual(seeded["created_count"], 28)
            self.assertEqual(seeded["updated_count"], 1)  # Only 0..99 placeholder updated.
            self.assertEqual(len(seeded["cases"]), 31)

            placeholder_after = store.one(db, "fuzzy_validation_cases", id=placeholder_id)
            self.assertNotEqual(float(placeholder_after["expected_max"]), 99.0)
            custom_after = store.one(db, "fuzzy_validation_cases", id=custom_id)
            self.assertEqual(float(custom_after["expected_min"]), 40.0)
            self.assertEqual(float(custom_after["expected_max"]), 60.0)

            # With recalculate_existing=True, custom case is updated too; all cases pass validate().
            reseeded = self.fuzzy_validation_cases.seed_boundary_cases(
                db,
                self.draft_model_id,
                self.user,
                tolerance=0.5,
                recalculate_existing=True,
            )
            self.assertEqual(reseeded["created_count"], 0)
            self.assertEqual(reseeded["updated_count"], 30)
            custom_recalc = store.one(db, "fuzzy_validation_cases", id=custom_id)
            self.assertAlmostEqual(float(custom_recalc["expected_min"]), 49.5, places=3)
            self.assertAlmostEqual(float(custom_recalc["expected_max"]), 50.5, places=3)

            results = self.fuzzy_validation_cases.validate(db, self.draft_model_id, self.user)
            self.assertEqual(len(results), 31)
            self.assertTrue(all(item["passed"] for item in results))
            readiness = self.fuzzy_model_versions.publication_readiness(db, self.draft_model_id)
            validation_checks = [c for c in readiness["checks"] if c["key"].startswith("validation-")]
            self.assertEqual(len(validation_checks), 3)
            self.assertTrue(all(c["ready"] for c in validation_checks))


if __name__ == "__main__":
    unittest.main()
