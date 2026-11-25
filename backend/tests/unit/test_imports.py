import importlib
import importlib.util
import io
import os
import sys
import types
import unittest
from unittest.mock import patch

os.environ.setdefault("APP_SECRET", "unit-test-only-secret-at-least-32-characters")
os.environ.setdefault("DB_PASSWORD", "unit-test-no-live-database")
os.environ.setdefault("PUBLIC_ORIGIN", "http://testserver")

HAS_OPENPYXL = importlib.util.find_spec("openpyxl") is not None
if HAS_OPENPYXL:
    from openpyxl import Workbook
else:
    Workbook = None


class ImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        stubs = {}
        if importlib.util.find_spec("argon2") is None:
            argon2_mod = types.ModuleType("argon2")
            argon2_mod.PasswordHasher = lambda: object()
            exc_mod = types.ModuleType("argon2.exceptions")
            exc_mod.VerificationError = Exception
            stubs["argon2"] = argon2_mod
            stubs["argon2.exceptions"] = exc_mod
        if not HAS_OPENPYXL:
            openpyxl_mod = types.ModuleType("openpyxl")
            openpyxl_mod.Workbook = object
            openpyxl_mod.load_workbook = lambda *args, **kwargs: None
            stubs["openpyxl"] = openpyxl_mod
        if stubs:
            p = patch.dict(sys.modules, stubs)
            p.start()
            cls.addClassCleanup(p.stop)
        mod = importlib.import_module("app.services.transcript_imports")
        cls.mod = mod
        cls.parse = staticmethod(mod.parse)
        cls.export_text = staticmethod(mod.export_text)
        cls.template = staticmethod(mod.template)

    def test_csv_headers_and_zero_prefixed_codes(self):
        content = "semester,kode_mk,nama_mk,nilai_huruf\n1,001,Pengantar,A\n".encode()
        self.assertEqual(self.parse("grades.csv", content, "text/csv")[0]["kode_mk"], "001")
        with self.assertRaises(ValueError):
            self.parse("grades.csv", b"wrong,header\nx,y", "text/csv")

    def test_csv_accepts_unm_12_letter_grades(self):
        grades = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"]
        lines = ["semester,kode_mk,nama_mk,nilai_huruf"]
        for idx, letter in enumerate(grades, 1):
            lines.append(f"1,MK{idx:03d},Mata Kuliah {idx},{letter}")
        rows = self.parse("unm.csv", "\n".join(lines).encode("utf-8"), "text/csv")
        self.assertEqual([r["nilai_huruf"] for r in rows], grades)

    def test_extension_formula_and_limit(self):
        with self.assertRaises(ValueError):
            self.parse("grades.pdf", b"%PDF", "application/pdf")
        with self.assertRaises(ValueError):
            self.parse("grades.csv", b"x" * 10485761, "text/csv")
        content = "semester,kode_mk,nama_mk,nilai_huruf\n1,001,=HYPERLINK(\"x\"),A\n".encode()
        with self.assertRaises(ValueError):
            self.parse("grades.csv", content, "text/csv")

    @unittest.skipIf(Workbook is None, "openpyxl tidak terpasang di environment lokal")
    def test_xlsx_formulas_and_structure(self):
        workbook = Workbook()
        workbook.active.append(["semester", "kode_mk", "nama_mk", "nilai_huruf"])
        workbook.active.append([1, "001", "Pengantar", "=1+1"])
        content = io.BytesIO()
        workbook.save(content)
        with self.assertRaises(ValueError):
            self.parse(
                "grades.xlsx",
                content.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        with self.assertRaises(ValueError):
            self.parse("grades.xlsx", b"not a zip", "application/octet-stream")

    def test_export_formula_injection(self):
        for value in ["=1+1", "+SUM(A1)", "@CMD", "-1+2", "  =1"]:
            self.assertTrue(self.export_text(value).startswith("'"))
        self.assertEqual(self.export_text("001234"), "001234")
        self.assertEqual(self.export_text(3), 3)

    def test_csv_semicolon_and_blank_optional_rows_skipped(self):
        content = (
            "\ufeffsemester;kode_mk;nama_mk;nilai_huruf\r\n"
            "1;001;Pengantar;A-\r\n"
            "2;002;Opsional;\r\n"
        ).encode("utf-8")
        rows = self.parse("khs.csv", content, "text/csv")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kode_mk"], "001")
        self.assertEqual(rows[0]["nilai_huruf"], "A-")

        empty_grades = "semester,kode_mk,nama_mk,nilai_huruf\n1,001,Pengantar,\n".encode("utf-8")
        with self.assertRaises(ValueError):
            self.parse("empty.csv", empty_grades, "text/csv")

    def test_csv_template_generation(self):
        master = {
            "courses": [
                {"id": 1, "semester": 1, "code": "001", "name": "Pengantar, Dasar", "credits": 3},
                {"id": 2, "semester": 2, "code": "MK02", "name": "Jaringan", "credits": 3},
            ],
            "weights": [{"course_id": 1, "is_required": True}],
            "conversions": [{"letter_grade": "A", "grade_points": 4.0, "normalized_score": 100.0}],
        }
        assessment = {"model_version_id": 1, "current_semester": 2}
        with patch.object(self.mod, "for_assessment", return_value=master):
            raw, mime, name = self.template(None, assessment, "csv")
        self.assertEqual(name, "template-nilai.csv")
        self.assertEqual(mime, "text/csv; charset=utf-8")
        self.assertTrue(raw.startswith(b"\xef\xbb\xbf"))
        decoded = raw.decode("utf-8-sig")
        self.assertIn("\r\n", decoded)
        self.assertTrue(decoded.startswith("semester,kode_mk,nama_mk,nilai_huruf\r\n"))
        self.assertIn('1,001,"Pengantar, Dasar",', decoded)

    @unittest.skipIf(Workbook is None, "openpyxl tidak terpasang di environment lokal")
    def test_xlsx_template_structure_and_roundtrip(self):
        from openpyxl import load_workbook

        master = {
            "courses": [
                {"id": 1, "semester": 1, "code": "001", "name": "Pengantar", "credits": 3},
                {"id": 2, "semester": 2, "code": "002", "name": "Opsional", "credits": 2},
            ],
            "weights": [{"course_id": 1, "is_required": True}],
            "conversions": [
                {"letter_grade": "A", "grade_points": 4.0, "normalized_score": 100.0},
                {"letter_grade": "A-", "grade_points": 3.75, "normalized_score": 93.75},
            ],
        }
        assessment = {"model_version_id": 1, "current_semester": 2}
        with patch.object(self.mod, "for_assessment", return_value=master), patch.object(
            self.mod, "one", return_value={"id": 1, "version_code": "TEKOM-ACO-001"}
        ):
            raw, mime, name = self.template(None, assessment, "xlsx")

        self.assertEqual(name, "template-nilai.xlsx")
        self.assertEqual(mime, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

        wb = load_workbook(io.BytesIO(raw))
        self.assertEqual(wb.sheetnames, ["Nilai", "Panduan & Skala Nilai"])
        self.assertEqual(wb.active.title, "Nilai")
        sheet = wb["Nilai"]
        self.assertEqual([sheet.cell(1, i).value for i in range(1, 5)], ["semester", "kode_mk", "nama_mk", "nilai_huruf"])
        self.assertTrue(len(sheet.data_validations.dataValidation) >= 1)
        for ws in wb.worksheets:
            for row in ws.iter_rows():
                for cell in row:
                    self.assertNotEqual(cell.data_type, "f")

        # Fill only row 2 (leaving optional row 3 blank), switch active sheet to Panduan, and re-parse.
        sheet.cell(2, 4, "A-")
        wb.active = 1
        edited = io.BytesIO()
        wb.save(edited)
        parsed = self.parse(
            "template-nilai.xlsx",
            edited.getvalue(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["kode_mk"], "001")
        self.assertEqual(parsed[0]["nilai_huruf"], "A-")
