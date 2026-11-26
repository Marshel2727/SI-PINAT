import importlib
import importlib.util
import json
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

from fastapi import HTTPException, Response
from sqlalchemy import Integer, MetaData, create_engine
from sqlalchemy.sql.sqltypes import Integer as IntegerType

from app.core.config import settings
from app.repositories import store
from app.schemas.inputs import (
    AdminStudentCreate,
    AdminStudentResetPassword,
    AdminStudentUpdate,
    AssessmentCreate,
    Profile,
    StudentLogin,
    StudentRegister,
)


def _install_optional_stubs():
    """Provide lightweight stubs only when optional third-party packages are absent locally."""
    patches = []
    if importlib.util.find_spec("argon2") is None:
        class StubVerificationError(Exception):
            pass

        class StubPasswordHasher:
            def hash(self, password: str) -> str:
                return f"stub-argon2:{password}"

            def verify(self, stored_hash: str, password: str) -> bool:
                if stored_hash == f"stub-argon2:{password}":
                    return True
                raise StubVerificationError("Invalid password")

        argon2_mod = types.ModuleType("argon2")
        argon2_mod.PasswordHasher = StubPasswordHasher
        exc_mod = types.ModuleType("argon2.exceptions")
        exc_mod.VerificationError = StubVerificationError
        patches.append(patch.dict(sys.modules, {"argon2": argon2_mod, "argon2.exceptions": exc_mod}))
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
        platypus_mod.SimpleDocTemplate = object
        platypus_mod.Paragraph = object
        platypus_mod.Spacer = object
        platypus_mod.Table = object
        platypus_mod.TableStyle = object
        lib_mod.colors = colors_mod
        lib_mod.styles = styles_mod
        reportlab_mod.lib = lib_mod
        reportlab_mod.platypus = platypus_mod
        patches.append(patch.dict(
            sys.modules,
            {
                "reportlab": reportlab_mod,
                "reportlab.lib": lib_mod,
                "reportlab.lib.colors": colors_mod,
                "reportlab.lib.styles": styles_mod,
                "reportlab.platypus": platypus_mod,
            },
        ))
    return patches


def _fake_request(cookies=None):
    return types.SimpleNamespace(cookies=dict(cookies or {}))


def _cookies_from_response(response: Response) -> dict[str, str]:
    jar = {}
    for header in response.raw_headers:
        if header[0].lower() == b"set-cookie":
            raw = header[1].decode("latin-1").split(";", 1)[0]
            if "=" in raw:
                k, v = raw.split("=", 1)
                jar[k.strip()] = v.strip()
    return jar


class StudentFlowUnitTests(unittest.TestCase):
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

        self.security = importlib.import_module("app.core.security")
        self.student_auth = importlib.import_module("app.services.student_auth")
        self.assessments = importlib.import_module("app.services.assessments")
        self.assessment_grades = importlib.import_module("app.services.assessment_grades")
        self.assessment_items = importlib.import_module("app.services.assessment_items")
        self.assessment_answers = importlib.import_module("app.services.assessment_answers")
        self.fuzzy_model_versions = importlib.import_module("app.services.fuzzy_model_versions")
        self.fuzzy_traces = importlib.import_module("app.services.fuzzy_traces")
        self.recommendation_runs = importlib.import_module("app.services.recommendation_runs")
        self.recommendation_scores = importlib.import_module("app.services.recommendation_scores")
        self.transcript_imports = importlib.import_module("app.services.transcript_imports")

        with self.engine.begin() as db:
            self.admin_id = store.add(
                db,
                "admin_users",
                full_name="Admin Penguji",
                email="admin@sipinat.test",
                password_hash=self.security.passwords.hash("AdminPass123!"),
                is_active=True,
            )
            self.admin_user = {
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

            # Create 3 courses across semesters 1..4 so each specialization has distinct dominant weights.
            self.courses = [
                {
                    "id": store.add(db, "courses", code="MK101", name="Mikrokontroler", semester=1, credits=3, is_active=True),
                    "semester": 1,
                    "code": "MK101",
                    "name": "Mikrokontroler",
                    "spec_code": "ES-01",
                },
                {
                    "id": store.add(db, "courses", code="MK201", name="Kecerdasan Buatan", semester=3, credits=3, is_active=True),
                    "semester": 3,
                    "code": "MK201",
                    "name": "Kecerdasan Buatan",
                    "spec_code": "SC-02",
                },
                {
                    "id": store.add(db, "courses", code="MK401", name="Keamanan Jaringan", semester=4, credits=3, is_active=True),
                    "semester": 4,
                    "code": "MK401",
                    "name": "Keamanan Jaringan",
                    "spec_code": "JDF-03",
                },
            ]

            self.model_id = store.add(
                db,
                "fuzzy_model_versions",
                version_code="TEKOM-ACO-001",
                method="MAMDANI",
                defuzzification="CENTROID",
                sampling_step=0.1,
                status="DRAFT",
                created_by=self.admin_id,
            )
            self.fuzzy_model_versions.scaffold_defaults(db, self.model_id, self.admin_user)
            # Assign dominant weights per specialization (1.0 for own course, 0.2 for others; all required).
            spec_by_id = {s["id"]: s["code"] for s in self.specs}
            course_by_id = {c["id"]: c for c in self.courses}
            for cw in store.rows(db, "course_weights", model_version_id=self.model_id):
                own = course_by_id[cw["course_id"]]["spec_code"] == spec_by_id[cw["specialization_id"]]
                store.change(
                    db,
                    "course_weights",
                    cw["id"],
                    weight=1.0 if own else 0.1,
                    is_required=True,
                )
            store.change(
                db,
                "fuzzy_model_versions",
                self.model_id,
                status="PUBLISHED",
                published_at=store.now(),
            )

            # Seed 12 PUBLISHED questions per specialization (36 total) with varying correct option positions.
            self.question_correct_option = {}
            for spec in self.specs:
                for idx in range(1, 13):
                    qid = store.add(
                        db,
                        "questions",
                        specialization_id=spec["id"],
                        code=f"{spec['code']}-Q{idx:02d}",
                        revision=1,
                        prompt=f"Pertanyaan {spec['code']} #{idx}",
                        status="PUBLISHED",
                    )
                    correct_idx = idx % 4
                    for opt_idx, label in enumerate(["A", "B", "C", "D"]):
                        oid = store.add(
                            db,
                            "question_options",
                            question_id=qid,
                            label=label,
                            option_text=f"Opsi {label} soal {spec['code']}-{idx}",
                            is_correct=(opt_idx == correct_idx),
                        )
                        if opt_idx == correct_idx:
                            self.question_correct_option[qid] = oid

    def _register_student(self, db, nim="250210501029", name="Andi Pratama", class_name="TEKOM-A", password="Password123!"):
        resp = Response()
        result = self.student_auth.register(
            db,
            StudentRegister(
                nim=nim,
                full_name=name,
                class_name=class_name,
                password=password,
                confirm_password=password,
            ),
            resp,
        )
        cookies = _cookies_from_response(resp)
        return result, cookies

    def _grade_payload(self, grade_map):
        return [
            {
                "semester": c["semester"],
                "kode_mk": c["code"],
                "nama_mk": c["name"],
                "nilai_huruf": grade_map[c["code"]],
            }
            for c in self.courses
        ]

    def test_tekom_register_login_and_non_tekom_forbidden(self):
        with self.engine.begin() as db:
            # Non-TEKOM UNM NIM is rejected on register.
            with self.assertRaises(HTTPException) as non_tekom_reg:
                self.student_auth.register(
                    db,
                    StudentRegister(
                        nim="250209501001",
                        full_name="Mahasiswa PTIK",
                        class_name="PTIK-A",
                        password="Password123!",
                        confirm_password="Password123!",
                    ),
                    Response(),
                )
            self.assertEqual(non_tekom_reg.exception.status_code, 403)
            self.assertEqual(non_tekom_reg.exception.detail["code"], "NON_TEKOM_FORBIDDEN")

            # Valid TEKOM NIM registers and receives sipinat_student cookie.
            reg, cookies = self._register_student(db, nim="250210501029", name="Andi Pratama")
            self.assertEqual(reg["student"]["nim"], "250210501029")
            self.assertEqual(reg["student"]["study_program"], "TEKOM")
            self.assertIsNone(reg["latest_assessment"])
            self.assertIn("sipinat_student", cookies)

            # Duplicate registration on same NIM is rejected with 409.
            with self.assertRaises(HTTPException) as dup:
                self._register_student(db, nim="250210501029", name="Andi Lain")
            self.assertEqual(dup.exception.status_code, 409)

            # Wrong password rejected with 401.
            with self.assertRaises(HTTPException) as bad_pw:
                self.student_auth.login(
                    db,
                    StudentLogin(nim="250210501029", password="WrongPassword!"),
                    Response(),
                )
            self.assertEqual(bad_pw.exception.status_code, 401)

            # Valid login works and returns session cookie.
            login_resp = Response()
            logged_in = self.student_auth.login(
                db,
                StudentLogin(nim="250210501029", password="Password123!"),
                login_resp,
            )
            login_cookies = _cookies_from_response(login_resp)
            self.assertEqual(logged_in["student"]["nim"], "250210501029")
            student_row = self.security.current_student(_fake_request(login_cookies), db, required=True)
            self.assertEqual(student_row["nim"], "250210501029")

            # Non-TEKOM account created by admin is rejected on login with 403 NON_TEKOM_FORBIDDEN.
            self.student_auth.admin_create_student(
                db,
                AdminStudentCreate(
                    nim="250209501099",
                    full_name="Mahasiswa Luar",
                    class_name="PTIK-B",
                    study_program="ptik",
                    password="Password123!",
                    is_active=True,
                ),
                self.admin_user,
            )
            with self.assertRaises(HTTPException) as non_tekom_login:
                self.student_auth.login(
                    db,
                    StudentLogin(nim="250209501099", password="Password123!"),
                    Response(),
                )
            self.assertEqual(non_tekom_login.exception.status_code, 403)
            self.assertEqual(non_tekom_login.exception.detail["code"], "NON_TEKOM_FORBIDDEN")

            # Logout revokes session so current_student raises 401.
            logout_resp = Response()
            self.student_auth.logout(db, _fake_request(login_cookies), logout_resp)
            with self.assertRaises(HTTPException) as unauth:
                self.security.current_student(_fake_request(login_cookies), db, required=True)
            self.assertEqual(unauth.exception.status_code, 401)

            # Legacy pre-seeded TEKOM student without password activates cleanly; non-TEKOM fails.
            store.add(db, "students", nim="250210500030", full_name="Legacy Tekom", study_program="TEKOM")
            act_res, _ = self._register_student(db, nim="250210500030", name="Legacy Tekom Baru", password="NewPass123!")
            self.assertEqual(act_res["student"]["full_name"], "Legacy Tekom Baru")

    def test_admin_student_crud_and_reset_password_revokes_sessions(self):
        with self.engine.begin() as db:
            created = self.student_auth.admin_create_student(
                db,
                AdminStudentCreate(
                    nim="250210501055",
                    full_name="Siti Aminah",
                    class_name="TEKOM-B",
                    study_program="tekom",
                    password="Password123!",
                    is_active=True,
                ),
                self.admin_user,
            )
            self.assertEqual(created["study_program"], "TEKOM")
            self.assertTrue(created["has_password"])
            self.assertNotIn("password_hash", created)

            # Student logs in.
            login_resp = Response()
            self.student_auth.login(db, StudentLogin(nim="250210501055", password="Password123!"), login_resp)
            cookies = _cookies_from_response(login_resp)

            # Admin lists and filters students.
            self.student_auth.admin_create_student(
                db,
                AdminStudentCreate(
                    nim="2509990001",
                    full_name="Budi Non Tekom",
                    class_name="SI-A",
                    study_program="SISTEM INFORMASI",
                    password="Password123!",
                    is_active=True,
                ),
                self.admin_user,
            )
            tekom_only, total_tekom = self.student_auth.admin_list_students(db, study_program="TEKOM")
            non_tekom_only, total_non = self.student_auth.admin_list_students(db, study_program="Non-TEKOM")
            self.assertEqual(total_tekom, 1)
            self.assertEqual(tekom_only[0]["nim"], "250210501055")
            self.assertEqual(total_non, 1)
            self.assertEqual(non_tekom_only[0]["nim"], "2509990001")

            # Reset password revokes existing sessions and requires new password.
            reset_res = self.student_auth.admin_reset_password(
                db,
                int(created["id"]),
                AdminStudentResetPassword(new_password="ResetPass999!"),
                self.admin_user,
            )
            self.assertTrue(reset_res["password_reset"])
            self.assertEqual(reset_res["revoked_sessions"], 1)
            with self.assertRaises(HTTPException) as old_sess:
                self.security.current_student(_fake_request(cookies), db, required=True)
            self.assertEqual(old_sess.exception.status_code, 401)

            new_login_resp = Response()
            self.student_auth.login(db, StudentLogin(nim="250210501055", password="ResetPass999!"), new_login_resp)
            new_cookies = _cookies_from_response(new_login_resp)

            # Updating study_program to non-TEKOM or deactivating revokes session.
            updated = self.student_auth.admin_update_student(
                db,
                int(created["id"]),
                AdminStudentUpdate(full_name="Siti Updated", study_program="PTIK", is_active=False),
                self.admin_user,
            )
            self.assertEqual(updated["full_name"], "Siti Updated")
            self.assertEqual(updated["study_program"], "PTIK")
            self.assertFalse(updated["is_active"])
            with self.assertRaises(HTTPException) as revoked_after_update:
                self.security.current_student(_fake_request(new_cookies), db, required=True)
            self.assertEqual(revoked_after_update.exception.status_code, 401)

    def test_semester_enforcement_and_randomization_across_accounts(self):
        with self.engine.begin() as db:
            # Unauthenticated FULL assessment creation fails with 401.
            with self.assertRaises(HTTPException) as unauth_create:
                self.assessments.create(
                    db,
                    AssessmentCreate(mode="FULL", semester=4),
                    Response(),
                    _fake_request({}),
                )
            self.assertEqual(unauth_create.exception.status_code, 401)

            _, cookies_a = self._register_student(db, nim="250210501001", name="Mahasiswa A")
            _, cookies_b = self._register_student(db, nim="250210501002", name="Mahasiswa B")
            req_a = _fake_request(cookies_a)
            req_b = _fake_request(cookies_b)

            # Semester < 4 rejected on create and profile for FULL mode.
            with self.assertRaises(HTTPException) as low_sem_create:
                self.assessments.create(db, AssessmentCreate(mode="FULL", semester=3), Response(), req_a)
            self.assertEqual(low_sem_create.exception.status_code, 422)

            a_summary = self.assessments.create(
                db,
                AssessmentCreate(mode="FULL", semester=4, preferred_specialization_code="ES-01"),
                Response(),
                req_a,
            )
            b_summary = self.assessments.create(
                db,
                AssessmentCreate(mode="FULL", semester=4, preferred_specialization_code="SC-02"),
                Response(),
                req_b,
            )
            a_row = store.one(db, "assessments", public_id=a_summary["public_id"])
            b_row = store.one(db, "assessments", public_id=b_summary["public_id"])

            with self.assertRaises(HTTPException) as low_sem_profile:
                self.assessments.profile(db, a_row, Profile(semester=3, preferred_specialization_code="ES-01"))
            self.assertEqual(low_sem_profile.exception.status_code, 422)

            # Save complete semester 1..4 grades for both accounts.
            self.assessment_grades.save(
                db,
                store.one(db, "assessments", id=a_row["id"]),
                self._grade_payload({"MK101": "A", "MK201": "B", "MK401": "C"}),
                allow_incomplete=False,
            )
            self.assessment_grades.save(
                db,
                store.one(db, "assessments", id=b_row["id"]),
                self._grade_payload({"MK101": "A", "MK201": "B", "MK401": "C"}),
                allow_incomplete=False,
            )

            packet_a = self.assessment_items.start(db, store.one(db, "assessments", id=a_row["id"]))
            packet_b = self.assessment_items.start(db, store.one(db, "assessments", id=b_row["id"]))

            self.assertEqual(len(packet_a), 30)
            self.assertEqual(len(packet_b), 30)
            # 10 questions per specialization in both packets.
            for spec in self.specs:
                self.assertEqual(sum(1 for item in packet_a if item["specialization_code"] == spec["code"]), 10)
                self.assertEqual(sum(1 for item in packet_b if item["specialization_code"] == spec["code"]), 10)

            # Question sequences differ across two independent accounts.
            q_seq_a = [item["question_id"] for item in packet_a]
            q_seq_b = [item["question_id"] for item in packet_b]
            self.assertNotEqual(q_seq_a, q_seq_b)

            # Re-calling start returns the exact same randomized packet & option order for the account.
            packet_a_again = self.assessment_items.start(db, store.one(db, "assessments", id=a_row["id"]))
            self.assertEqual([i["question_id"] for i in packet_a_again], q_seq_a)
            self.assertEqual([[o["id"] for o in i["options"]] for i in packet_a_again], [[o["id"] for o in i["options"]] for i in packet_a])

            # Options are shuffled per item while display labels remain sequential A..D and real IDs match DB.
            option_orders_a = [[o["id"] for o in item["options"]] for item in packet_a]
            for item in packet_a:
                self.assertEqual([o["label"] for o in item["options"]], ["A", "B", "C", "D"])
                self.assertTrue(all("is_correct" not in o for o in item["options"]))
                db_item = store.one(db, "assessment_items", id=item["id"])
                self.assertEqual([o["id"] for o in item["options"]], db_item["option_order"])
            # Across 30 items, shuffled option orders are not all identical to raw DB insertion order.
            raw_orders_a = [
                [o["id"] for o in store.rows(db, "question_options", question_id=item["question_id"])]
                for item in packet_a
            ]
            self.assertNotEqual(option_orders_a, raw_orders_a)

            # Verify JSON string fallback for option_order works cleanly.
            first_db_item = store.one(db, "assessment_items", id=packet_a[0]["id"])
            reversed_ids = list(reversed(first_db_item["option_order"]))
            store.change(db, "assessment_items", first_db_item["id"], option_order=json.dumps(reversed_ids))
            reloaded = self.assessment_items.items(db, store.one(db, "assessments", id=a_row["id"]))
            self.assertEqual([o["id"] for o in reloaded[0]["options"]], reversed_ids)
            self.assertEqual([o["label"] for o in reloaded[0]["options"]], ["A", "B", "C", "D"])

            # Answer all 30 questions using real correct option IDs -> competency score is 100.0 for all 3 specs.
            for item in packet_a:
                correct_oid = self.question_correct_option[item["question_id"]]
                self.assertIn(correct_oid, [o["id"] for o in item["options"]])
                self.assessment_answers.save(
                    db,
                    store.one(db, "assessments", id=a_row["id"]),
                    item["id"],
                    correct_oid,
                )
            completed = self.recommendation_runs.complete(db, store.one(db, "assessments", id=a_row["id"]))
            for sc in completed["scores"]:
                self.assertEqual(float(sc["competency_score"]), 100.0)

    def test_1x_lock_post_completion_grade_edit_recalc_and_dashboard(self):
        with tempfile.TemporaryDirectory() as tmpdir, patch.object(settings(), "upload_dir", tmpdir):
            with self.engine.begin() as db:
                _, cookies = self._register_student(db, nim="250210501077", name="Dewi Sartika")
                req = _fake_request(cookies)

                create_resp = Response()
                created = self.assessments.create(
                    db,
                    AssessmentCreate(mode="FULL", semester=4, preferred_specialization_code="ES-01"),
                    create_resp,
                    req,
                )
                # Calling create again while DRAFT returns the exact same unfinished assessment.
                second_resp = Response()
                reused = self.assessments.create(
                    db,
                    AssessmentCreate(mode="FULL", semester=4, preferred_specialization_code="SC-02"),
                    second_resp,
                    req,
                )
                self.assertEqual(reused["public_id"], created["public_id"])
                self.assertIn("sipinat_a_" + created["public_id"], _cookies_from_response(second_resp))

                assessment = store.one(db, "assessments", public_id=created["public_id"])
                # Initial grades favor ES-01 strongly.
                self.assessment_grades.save(
                    db,
                    assessment,
                    self._grade_payload({"MK101": "A", "MK201": "E", "MK401": "E"}),
                    allow_incomplete=False,
                )
                packet = self.assessment_items.start(db, store.one(db, "assessments", id=assessment["id"]))

                # While IN_PROGRESS, grade editing (manual & import) is blocked with 409.
                first_item = packet[0]
                self.assessment_answers.save(
                    db,
                    store.one(db, "assessments", id=assessment["id"]),
                    first_item["id"],
                    self.question_correct_option[first_item["question_id"]],
                )
                with self.assertRaises(HTTPException) as locked_during_test:
                    self.assessment_grades.save(
                        db,
                        store.one(db, "assessments", id=assessment["id"]),
                        self._grade_payload({"MK101": "A", "MK201": "A", "MK401": "A"}),
                    )
                self.assertEqual(locked_during_test.exception.status_code, 409)

                # Answer remaining 29 questions and complete assessment.
                for item in packet[1:]:
                    self.assessment_answers.save(
                        db,
                        store.one(db, "assessments", id=assessment["id"]),
                        item["id"],
                        self.question_correct_option[item["question_id"]],
                    )
                initial_result = self.recommendation_runs.complete(
                    db, store.one(db, "assessments", id=assessment["id"])
                )
                self.assertEqual(initial_result["top_specialization_codes"], ["ES-01"])
                original_completed_at = store.one(db, "assessments", id=assessment["id"])["completed_at"]

                # 1x completion lock checks:
                # 1) Re-creating FULL assessment returns existing COMPLETED session.
                recreate_completed_resp = Response()
                returned_completed = self.assessments.create(
                    db,
                    AssessmentCreate(mode="FULL", semester=4),
                    recreate_completed_resp,
                    req,
                )
                self.assertEqual(returned_completed["public_id"], created["public_id"])
                self.assertEqual(returned_completed["status"], "COMPLETED")
                # 2) test/start returns 409.
                with self.assertRaises(HTTPException) as start_locked:
                    self.assessment_items.start(db, store.one(db, "assessments", id=assessment["id"]))
                self.assertEqual(start_locked.exception.status_code, 409)
                # 3) answer returns 409.
                with self.assertRaises(HTTPException) as ans_locked:
                    self.assessment_answers.save(
                        db,
                        store.one(db, "assessments", id=assessment["id"]),
                        first_item["id"],
                        self.question_correct_option[first_item["question_id"]],
                    )
                self.assertEqual(ans_locked.exception.status_code, 409)
                # 4) profile() returns 409 (initial preference/semester locked).
                with self.assertRaises(HTTPException) as prof_locked:
                    self.assessments.profile(
                        db,
                        store.one(db, "assessments", id=assessment["id"]),
                        Profile(semester=4, preferred_specialization_code="SC-02"),
                    )
                self.assertEqual(prof_locked.exception.status_code, 409)

                # Incomplete grades while COMPLETED must fail 422 GRADES_INVALID and keep existing grades!
                with self.assertRaises(HTTPException) as invalid_edit:
                    self.assessment_grades.save(
                        db,
                        store.one(db, "assessments", id=assessment["id"]),
                        [{"semester": 1, "kode_mk": "MK101", "nama_mk": "Mikrokontroler", "nilai_huruf": "A"}],
                    )
                self.assertEqual(invalid_edit.exception.status_code, 422)
                self.assertEqual(invalid_edit.exception.detail["code"], "GRADES_INVALID")
                self.assertEqual(len(store.rows(db, "assessment_grades", assessment_id=assessment["id"])), 3)

                # Valid post-completion grade edit flips top specialization to SC-02 and triggers Mamdani recalc!
                edit_res = self.assessment_grades.save(
                    db,
                    store.one(db, "assessments", id=assessment["id"]),
                    self._grade_payload({"MK101": "E", "MK201": "A", "MK401": "E"}),
                )
                self.assertTrue(edit_res["recalculated"])
                after_edit_assessment = store.one(db, "assessments", id=assessment["id"])
                self.assertEqual(after_edit_assessment["status"], "COMPLETED")
                self.assertEqual(after_edit_assessment["completed_at"], original_completed_at)

                recalc_result = self.recommendation_scores.result(db, after_edit_assessment)
                self.assertGreater(recalc_result["run_id"], initial_result["run_id"])
                self.assertEqual(recalc_result["top_specialization_codes"], ["SC-02"])
                trace = self.fuzzy_traces.trace(db, after_edit_assessment, "SC-02")
                self.assertEqual(trace["score"]["specialization_code"], "SC-02")

                # CSV import with confirm=True on COMPLETED also triggers automatic recalculation (flip to JDF-03)!
                csv_bytes = (
                    "semester,kode_mk,nama_mk,nilai_huruf\n"
                    "1,MK101,Mikrokontroler,E\n"
                    "3,MK201,Kecerdasan Buatan,E\n"
                    "4,MK401,Keamanan Jaringan,A\n"
                ).encode("utf-8")
                imported = self.transcript_imports.import_file(
                    db,
                    store.one(db, "assessments", id=assessment["id"]),
                    "khs-baru.csv",
                    csv_bytes,
                    "text/csv",
                    confirm=True,
                )
                self.assertTrue(imported["committed"])
                self.assertTrue(imported["recalculated"])

                final_result = self.recommendation_scores.result(
                    db, store.one(db, "assessments", id=assessment["id"])
                )
                self.assertGreater(final_result["run_id"], recalc_result["run_id"])
                self.assertEqual(final_result["top_specialization_codes"], ["JDF-03"])

                # Dashboard must count this student ONCE (only latest SUCCESS run -> JDF-03: 1), not 3 times!
                dash = self.recommendation_scores.dashboard(db)
                self.assertEqual(dash["total_assessments"], 1)
                self.assertEqual(dash["completed"], 1)
                self.assertEqual(len(dash["distribution"]), 1)
                self.assertEqual(dash["distribution"][0]["name"], "Jaringan dan Forensik")
                self.assertEqual(dash["distribution"][0]["total"], 1)

    def test_question_bank_not_ready_when_under_10_published(self):
        with self.engine.begin() as db:
            # Archive 3 ES-01 questions so only 9 remain published.
            es_questions = store.rows(db, "questions", specialization_id=self.specs[0]["id"], status="PUBLISHED")
            for q in es_questions[:3]:
                store.change(db, "questions", q["id"], status="ARCHIVED")

            _, cookies = self._register_student(db, nim="250210501088", name="Kurang Soal")
            created = self.assessments.create(
                db,
                AssessmentCreate(mode="FULL", semester=4, preferred_specialization_code="ES-01"),
                Response(),
                _fake_request(cookies),
            )
            assessment = store.one(db, "assessments", public_id=created["public_id"])
            self.assessment_grades.save(
                db,
                assessment,
                self._grade_payload({"MK101": "A", "MK201": "A", "MK401": "A"}),
                allow_incomplete=False,
            )
            with self.assertRaises(HTTPException) as not_ready:
                self.assessment_items.start(db, store.one(db, "assessments", id=assessment["id"]))
            self.assertEqual(not_ready.exception.status_code, 503)
            self.assertEqual(not_ready.exception.detail["code"], "QUESTION_BANK_NOT_READY")


if __name__ == "__main__":
    unittest.main()
