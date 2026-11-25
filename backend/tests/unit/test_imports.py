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
HAS_PYPDF = importlib.util.find_spec("pypdf") is not None
if HAS_OPENPYXL:
    from openpyxl import Workbook
else:
    Workbook = None


def _build_text_pdf(pages):
    """Construct a minimal valid multi-page PDF containing extractable text lines."""
    page_objs = []
    page_ids = []
    font_id = 3 + len(pages) * 2
    for idx, lines in enumerate(pages):
        page_id = 3 + idx * 2
        content_id = page_id + 1
        page_ids.append(page_id)
        ops = ["BT", "/F1 10 Tf", "40 760 Td"]
        for line_idx, line in enumerate(lines):
            escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            if line_idx > 0:
                ops.append("0 -14 Td")
            ops.append(f"({escaped}) Tj")
        ops.append("ET")
        stream = "\n".join(ops).encode("latin-1", "replace")
        page_objs.append((page_id, f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>".encode()))
        page_objs.append((content_id, f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream"))

    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    all_objs = sorted([
        (1, b"<< /Type /Catalog /Pages 2 0 R >>"),
        (2, f"<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>".encode()),
        *page_objs,
        (font_id, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    ], key=lambda item: item[0])

    buf = io.BytesIO()
    buf.write(b"%PDF-1.4\n")
    offsets = {}
    for oid, body in all_objs:
        offsets[oid] = buf.tell()
        buf.write(f"{oid} 0 obj\n".encode() + body + b"\nendobj\n")
    xref_pos = buf.tell()
    buf.write(f"xref\n0 {len(all_objs) + 1}\n0000000000 65535 f \n".encode())
    for oid, _ in all_objs:
        buf.write(f"{offsets[oid]:010d} 00000 n \n".encode())
    buf.write(f"trailer\n<< /Size {len(all_objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode())
    return buf.getvalue()


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
                {"letter_grade": "C-", "grade_points": 1.75, "normalized_score": 43.75},
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
        guide = wb["Panduan & Skala Nilai"]
        self.assertEqual(guide.cell(12, 4).value, "Lulus")
        self.assertEqual(guide.cell(13, 4).value, "Lulus")
        self.assertEqual(guide.cell(14, 4).value, "Tidak Lulus")
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

    @unittest.skipIf(not HAS_PYPDF, "pypdf tidak terpasang di environment lokal")
    def test_pdf_siakad_unm_parsing_with_multiline_k_skip_and_code_alias(self):
        pdf_bytes = _build_text_pdf([
            [
                "KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI",
                "UNIVERSITAS NEGERI MAKASSAR",
                "JL. PETTARANI MAKASSAR 90222 Telp. 0411865677 Fax. 0411861377",
                "TRANSKRIP NILAI",
                "NAMA : MARSHEL ANDHINO S. GORUNG ANGKATAN/KELAS : 2025 / 01",
                "NO. INDUK MAHASISWA : 250210501029 FAKULTAS : TEKNIK",
                "TEMPAT/TGL LAHIR : MAKASSAR / 27 April 2006 PROGRAM STUDI : TEKNIK KOMPUTER - (S1)",
                "No Kode MK Matakuliah SKS Bobot Nilai Tahun/Semester",
                "1 21B01C101 RANGKAIAN ELEKTRONIKA 3 3.25 B+ 2025-2026 / Ganjil",
                "2 21B01C102 ALGORITME DAN PEMROGRAMAN",
                "DASAR 3 4.00 A 2025-2026 / Ganjil",
                "3 21B01C205 PENDIDIKAN AGAMA 2 3.75 A- 2025-2026 / Genap",
                "4 21B01C104 ALJABAR LINEAR I 3 2.00 C 2025-2026 / Ganjil",
                "5 21B01C301 PEMROGRAMAN LANJUT 3 0.00 K 2026-2027 / Ganjil",
            ],
            [
                "6 21B01C104 ALJABAR LINEAR I 3 3.00 B 2026-2027 / Ganjil",
                "7 21B01C303 ANALISIS DAN DESAIN ALGORITME 3 0.00 K 2026-2027 / Ganjil",
                "8 21B01C501 KERJA PRAKTEK 2 4.00 A 2027-2028 / Ganjil",
            ],
        ])
        master = {
            "courses": [
                {"id": 1, "semester": 1, "code": "21B10C101", "name": "Rangkaian Elektronika", "credits": 3},
                {"id": 2, "semester": 1, "code": "21B01C102", "name": "Algoritme & Pemrograman Dasar", "credits": 3},
                {"id": 3, "semester": 1, "code": "21B01C104", "name": "Aljabar Linear I", "credits": 3},
                {"id": 4, "semester": 2, "code": "21B01C205", "name": "Pendidikan Agama", "credits": 2},
            ],
            "weights": [],
            "conversions": [],
        }
        warnings = []
        rows = self.parse(
            "transkrip.pdf",
            pdf_bytes,
            "application/pdf",
            master=master,
            student_nim="250210501999",
            warnings=warnings,
        )
        by_code = {r["kode_mk"]: r for r in rows}
        self.assertEqual(set(by_code), {"21B10C101", "21B01C102", "21B01C104", "21B01C205"})
        self.assertEqual(by_code["21B10C101"]["nilai_huruf"], "B+")
        self.assertEqual(by_code["21B01C102"]["nilai_huruf"], "A")
        self.assertEqual(by_code["21B01C205"]["nilai_huruf"], "A-")
        # Retaken course uses the latest grade in chronological order.
        self.assertEqual(by_code["21B01C104"]["nilai_huruf"], "B")
        self.assertTrue(any("250210501029" in w for w in warnings))
        self.assertTrue(any("21B01C101" in w and "21B10C101" in w for w in warnings))
        self.assertTrue(any("K/T/BL" in w for w in warnings))
        self.assertTrue(any("di luar cakupan" in w for w in warnings))

    @unittest.skipIf(not HAS_PYPDF, "pypdf tidak terpasang di environment lokal")
    def test_pdf_rejects_empty_or_non_siakad_and_unsupported_extension(self):
        with self.assertRaises(ValueError):
            self.parse("transkrip.docx", b"PK\x03\x04", "application/octet-stream")
        with self.assertRaises(ValueError):
            self.parse("grades.pdf", b"%PDF", "application/pdf")

        blank_pdf = _build_text_pdf([[""]])
        with self.assertRaises(ValueError):
            self.parse("scan.pdf", blank_pdf, "application/pdf")

        non_siakad_pdf = _build_text_pdf([["Ini dokumen PDF biasa tanpa tabel transkrip SIAKAD UNM yang lengkap."]])
        with self.assertRaises(ValueError):
            self.parse("other.pdf", non_siakad_pdf, "application/pdf")
