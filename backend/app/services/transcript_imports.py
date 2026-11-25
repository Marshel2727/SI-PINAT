import csv
import hashlib
import io
import re
import uuid
import zipfile
from pathlib import Path
from openpyxl import load_workbook, Workbook
from app.core.errors import fail
from app.core.config import settings
from app.repositories.store import add, one, safe
from app.services.assessments import editable
from app.services.courses import for_assessment
from app.services.assessment_grades import check, readiness, save
from app.services.grade_conversions import UNM_FAILING_GRADES

HEADERS = ["semester", "kode_mk", "nama_mk", "nilai_huruf"]
PDF_ROW_RE = re.compile(
    r"(?:^|\s)(\d{1,3})\s+"
    r"((?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{5,15})\s+"
    r"(.{2,160}?)\s+"
    r"(\d{1,2})\s+"
    r"([0-4][.,]\d{2})\s+"
    r"([A-EKTabl][+\-\u2212\u2013]?|BL)\s+"
    r"(20\d{2}\s*-\s*20\d{2}\s*/\s*(?:Ganjil|Genap|Pendek|Antara))",
    re.IGNORECASE | re.DOTALL,
)
PDF_TABLE_START_RE = re.compile(r"No\s+Kode\s+MK\s+Matakuliah", re.IGNORECASE)
PDF_NIM_RE = re.compile(r"NO\.?\s*INDUK\s*MAHASISWA\s*:\s*([A-Z0-9]{4,25})", re.IGNORECASE)
_INFER_SEMESTER_RE = re.compile(r"[A-Z](\d)\d{2}$")


def _normalize_course_name(value: str) -> str:
    """Normalize course names so '&' and '+ Lab' variants match consistently."""
    cleaned = value.lower().replace("&", " dan ")
    cleaned = re.sub(r"\s*(?:\+|dan)\s*lab\b", "", cleaned)
    cleaned = re.sub(r"[^a-z0-9]+", " ", cleaned)
    return " ".join(cleaned.split())


def _is_dangerous_prefix(value: str) -> bool:
    return value.lstrip().startswith(("=", "+", "-", "@"))


def parse_siakad_pdf(content: bytes, master=None, student_nim: str | None = None, warnings=None):
    """Extract course grades from a native text PDF Transkrip Nilai SIAKAD UNM."""
    if not content.startswith(b"%PDF-"):
        raise ValueError("Struktur berkas PDF tidak sah.")
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(content))
    except Exception:
        raise ValueError("Berkas PDF tidak dapat dibaca.")
    if reader.is_encrypted:
        raise ValueError("PDF terenkripsi atau terkunci kata sandi tidak didukung.")
    if len(reader.pages) > 30:
        raise ValueError("PDF terlalu panjang (maksimal 30 halaman).")

    full_text = "\n".join((page.extract_text() or "") for page in reader.pages)
    if len(full_text.strip()) < 50:
        raise ValueError(
            "PDF tidak berisi teks (kemungkinan hasil foto/scan). Unduh PDF asli langsung dari SIAKAD UNM atau gunakan template Excel (.xlsx)."
        )

    if warnings is not None and student_nim:
        nim_match = PDF_NIM_RE.search(full_text)
        if nim_match:
            extracted_nim = nim_match.group(1).strip()
            if extracted_nim.upper() != student_nim.strip().upper():
                warnings.append(
                    f"NIM pada PDF ({extracted_nim}) berbeda dengan NIM sesi saat ini ({student_nim}). Pastikan berkas transkrip benar milik kamu."
                )

    table_match = PDF_TABLE_START_RE.search(full_text)
    table_text = full_text[table_match.end():] if table_match else full_text

    raw_matches = []
    for match in PDF_ROW_RE.finditer(table_text):
        code = match.group(2).strip().upper()
        if any(ch.isalpha() for ch in code) and any(ch.isdigit() for ch in code):
            raw_matches.append(match)
    if not raw_matches:
        raise ValueError(
            "Tabel Transkrip Nilai SIAKAD UNM tidak ditemukan pada PDF ini. Pastikan berkas berasal dari menu Cetak Transkrip Keseluruhan di SIAKAD UNM."
        )

    by_code = {}
    by_name = {}
    if master:
        by_code = {str(c["code"]).strip().upper(): c for c in master["courses"]}
        by_name = {_normalize_course_name(c["name"]): c for c in master["courses"]}

    accepted = {}
    skipped_k = 0
    skipped_outside = 0
    for match in raw_matches:
        code = match.group(2).strip().upper()
        nama_mk = " ".join(match.group(3).split())
        nilai = match.group(6).strip().upper().replace("\u2212", "-").replace("\u2013", "-")
        if nilai in {"K", "T", "BL"}:
            skipped_k += 1
            continue
        if any(_is_dangerous_prefix(part) for part in (code, nama_mk, nilai)):
            raise ValueError("Formula atau awalan berbahaya tidak diizinkan.")

        if master is not None:
            course = by_code.get(code) or by_name.get(_normalize_course_name(nama_mk))
            if not course:
                skipped_outside += 1
                continue
            if course["code"].strip().upper() != code and warnings is not None:
                warnings.append(
                    f"Kode {code} ({nama_mk}) pada PDF dicocokkan ke {course['code']} ({course['name']})."
                )
            accepted[course["code"]] = {
                "semester": str(course["semester"]),
                "kode_mk": course["code"],
                "nama_mk": course["name"],
                "nilai_huruf": nilai,
            }
        else:
            sem_match = _INFER_SEMESTER_RE.search(code)
            inferred_sem = sem_match.group(1) if sem_match else "1"
            accepted[code] = {
                "semester": inferred_sem,
                "kode_mk": code,
                "nama_mk": nama_mk,
                "nilai_huruf": nilai,
            }

    if warnings is not None:
        if skipped_k > 0:
            warnings.append(f"{skipped_k} mata kuliah berstatus belum selesai (K/T/BL) pada PDF dilewati otomatis.")
        if skipped_outside > 0:
            warnings.append(f"{skipped_outside} mata kuliah di luar cakupan semester/kurikulum aktif dilewati otomatis.")

    if not accepted:
        raise ValueError("Tidak ada nilai mata kuliah kurikulum aktif yang sudah berstatus selesai (A–E) pada PDF ini.")

    return sorted(accepted.values(), key=lambda r: (int(r["semester"]), r["kode_mk"]))


def parse(filename, content, content_type, master=None, student_nim=None, warnings=None):
    if not content or len(content) > 10 * 1024 * 1024:
        raise ValueError("Berkas kosong atau lebih dari 10 MB.")
    suffix = Path(filename).suffix.lower()
    if suffix not in {".csv", ".xlsx", ".pdf"}:
        raise ValueError("Hanya berkas PDF SIAKAD dan XLSX yang didukung.")
    if suffix == ".pdf":
        if content_type not in {"application/pdf", "application/octet-stream"}:
            raise ValueError("Tipe berkas PDF tidak sesuai.")
        return parse_siakad_pdf(content, master=master, student_nim=student_nim, warnings=warnings)
    if suffix == ".csv":
        if content_type not in {
            "text/csv",
            "text/plain",
            "application/vnd.ms-excel",
            "application/octet-stream",
        }:
            raise ValueError("Tipe berkas CSV tidak sesuai.")
        try:
            text = content.decode("utf-8-sig")
            first_line = next((line for line in text.splitlines() if line.strip()), "")
            delimiter = ";" if first_line and ";" in first_line and len(next(csv.reader([first_line], delimiter=","))) != len(HEADERS) else ","
            values = list(csv.reader(io.StringIO(text), delimiter=delimiter))
        except (UnicodeError, csv.Error):
            raise ValueError("CSV harus menggunakan UTF-8.")
    else:
        if content_type not in {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/octet-stream",
        } or not zipfile.is_zipfile(io.BytesIO(content)):
            raise ValueError("Struktur XLSX tidak sah.")
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            entries = archive.infolist()
            if len(entries) > 1000 or sum(v.file_size for v in entries) > 40 * 1024 * 1024:
                raise ValueError("Ukuran dekompresi XLSX terlalu besar.")
            if any("vbaproject" in e.filename.lower() or ".." in Path(e.filename).parts or e.filename.startswith(("/", "\\")) for e in entries):
                raise ValueError("Makro atau struktur arsip tidak diizinkan.")
            if "[Content_Types].xml" not in archive.namelist() or "xl/workbook.xml" not in archive.namelist():
                raise ValueError("Berkas bukan workbook XLSX.")
        try:
            workbook = load_workbook(
                io.BytesIO(content),
                read_only=True,
                data_only=False,
                keep_links=False,
            )
            sheet = workbook["Nilai"] if "Nilai" in workbook.sheetnames else workbook.active
            values = []
            for index, row in enumerate(sheet.iter_rows()):
                if index > 1000:
                    raise ValueError("Maksimal 1.000 baris data.")
                if any(cell.data_type == "f" for cell in row):
                    raise ValueError("Formula tidak diizinkan.")
                row_values = [cell.value if cell.value is not None else "" for cell in row]
                while len(row_values) > len(HEADERS) and not str(row_values[-1]).strip():
                    row_values.pop()
                values.append(row_values)
            workbook.close()
        except ValueError:
            raise
        except Exception:
            raise ValueError("Workbook XLSX tidak dapat dibaca.")
    if not values or [str(c).strip() for c in values[0]] != HEADERS:
        raise ValueError("Header wajib: " + ", ".join(HEADERS) + ".")
    data = []
    for row in values[1:]:
        if not any(str(c).strip() for c in row):
            continue
        if len(row) != 4:
            raise ValueError("Setiap baris wajib mempunyai empat kolom.")
        if any(str(c).lstrip().startswith(("=", "+", "-", "@")) for c in row):
            raise ValueError("Formula atau awalan berbahaya tidak diizinkan.")
        cleaned = [str(c).strip() for c in row]
        if not cleaned[3]:
            continue
        data.append(dict(zip(HEADERS, cleaned)))
        if len(data) > 1000:
            raise ValueError("Maksimal 1.000 baris data.")
    if not data:
        raise ValueError("Berkas belum memiliki nilai.")
    return data


def import_file(db, assessment, filename, content, content_type, confirm):
    editable(assessment)
    filename = Path(filename or "upload").name[:255]
    error, warnings = [], []
    try:
        master = for_assessment(db, assessment)
        student = one(db, "students", id=assessment["student_id"]) if assessment.get("student_id") else None
        student_nim = student["nim"] if student else None
        data = parse(filename, content, content_type, master=master, student_nim=student_nim, warnings=warnings)
        grades, error = check(db, assessment, data, warnings=warnings)
        state = readiness(db, assessment, grades)
        if confirm and not state["ready"]:
            error.append({
                "missing_required": state["missing_required"],
                "messages": state["errors"],
            })
    except ValueError as exc:
        data, grades, state = [], [], {"ready": False}
        error = [{"row": None, "messages": [str(exc)]}]
    key = uuid.uuid4().hex + Path(filename).suffix.lower() if not error else None
    if key:
        directory = Path(settings().upload_dir)
        directory.mkdir(parents=True, exist_ok=True)
        (directory / key).write_bytes(content)
    identifier = add(
        db,
        "transcript_imports",
        assessment_id=assessment["id"],
        original_filename=filename,
        storage_key=key,
        file_hash=hashlib.sha256(content).hexdigest(),
        status="INVALID" if error else "VALID",
        validation_errors=error or None,
    )
    if error:
    # Retain invalid import history, preserve previous valid grades.
        db.commit()
        fail(422, "Impor ditolak. Nilai sebelumnya tetap tersimpan.", "IMPORT_INVALID", error)
    result = save(db, assessment, data, "IMPORT", False) if confirm else {"grades": grades, **state}
    return {
        "import_id": identifier,
        "committed": confirm,
        "preview": safe(data),
        "warnings": warnings,
        **result,
    }


def _build_xlsx_template(courses, conversions, required_ids, version_code, current_semester):
    """Build a formatted 2-sheet XLSX transcript template without formulas."""
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.worksheet.datavalidation import DataValidation

    workbook = Workbook()
    workbook.properties.title = "Template Transkrip Nilai SI-PINAT"
    workbook.properties.creator = "SI-PINAT"

    navy = "0F294A"
    thin_side = Side(style="thin", color="CBD5E1")
    grade_side = Side(style="thin", color="94A3B8")
    header_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=Side(style="medium", color="1E3A5F"))
    cell_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    grade_border = Border(left=grade_side, right=grade_side, top=grade_side, bottom=grade_side)

    header_fill = PatternFill("solid", fgColor=navy)
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    body_font = Font(name="Calibri", size=11, color="0F172A")
    code_font = Font(name="Calibri", size=11, bold=True, color=navy)
    zebra_fills = (PatternFill("solid", fgColor="FFFFFF"), PatternFill("solid", fgColor="F8FAFC"))
    required_fill = PatternFill("solid", fgColor="FEF9C3")
    optional_fill = PatternFill("solid", fgColor="F1F5F9")

    center_align = Alignment(horizontal="center", vertical="center")
    left_wrap_align = Alignment(horizontal="left", vertical="center", wrap_text=True)

    # Sheet 1: Nilai (strict 4 columns A:D, row 1 = HEADERS)
    sheet = workbook.active
    sheet.title = "Nilai"
    sheet.append(HEADERS)
    sheet.row_dimensions[1].height = 28
    for col_idx in range(1, 5):
        cell = sheet.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = header_border

    for row_idx, course in enumerate(courses, start=2):
        sheet.append([
            int(course["semester"]),
            export_text(course["code"]),
            export_text(course["name"]),
            "",
        ])
        sheet.row_dimensions[row_idx].height = 24
        row_fill = zebra_fills[row_idx % 2]
        is_req = course["id"] in required_ids

        c_sem = sheet.cell(row=row_idx, column=1)
        c_sem.font = body_font
        c_sem.fill = row_fill
        c_sem.alignment = center_align
        c_sem.border = cell_border
        c_sem.number_format = "0"

        c_code = sheet.cell(row=row_idx, column=2)
        c_code.font = code_font
        c_code.fill = row_fill
        c_code.alignment = center_align
        c_code.border = cell_border
        c_code.number_format = "@"

        c_name = sheet.cell(row=row_idx, column=3)
        c_name.font = body_font
        c_name.fill = row_fill
        c_name.alignment = left_wrap_align
        c_name.border = cell_border

        c_grade = sheet.cell(row=row_idx, column=4)
        c_grade.font = code_font
        c_grade.fill = required_fill if is_req else optional_fill
        c_grade.alignment = center_align
        c_grade.border = grade_border
        c_grade.number_format = "@"

    last_row = max(1, len(courses) + 1)
    if courses and conversions:
        allowed = ",".join(str(c["letter_grade"]).strip().upper() for c in conversions)
        dv = DataValidation(type="list", formula1=f'"{allowed}"', allow_blank=True)
        dv.promptTitle = "Pilih Nilai Huruf"
        dv.prompt = "Pilih nilai huruf sesuai KHS. Kosongkan bila mata kuliah opsional belum diambil."
        dv.errorTitle = "Nilai Huruf Tidak Valid"
        dv.error = "Pilih nilai huruf resmi yang tersedia pada daftar dropdown."
        sheet.add_data_validation(dv)
        dv.add(f"D2:D{last_row}")

    max_code_len = max((len(str(c["code"])) for c in courses), default=10)
    max_name_len = max((len(str(c["name"])) for c in courses), default=30)
    sheet.column_dimensions["A"].width = 12
    sheet.column_dimensions["B"].width = max(16, max_code_len + 4)
    sheet.column_dimensions["C"].width = min(58, max(38, max_name_len + 6))
    sheet.column_dimensions["D"].width = 18
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = f"A1:D{last_row}"
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0

    # Sheet 2: Panduan & Skala Nilai (pure static values, zero formulas)
    guide = workbook.create_sheet("Panduan & Skala Nilai")
    max_sem = min(current_semester or 4, 4)
    required_count = sum(1 for c in courses if c["id"] in required_ids)

    guide.merge_cells("A1:E1")
    title_cell = guide["A1"]
    title_cell.value = "PANDUAN PENGISIAN TRANSKRIP NILAI — SI-PINAT"
    title_cell.fill = header_fill
    title_cell.font = Font(name="Calibri", size=13, bold=True, color="FFFFFF")
    title_cell.alignment = center_align
    guide.row_dimensions[1].height = 32

    guide.merge_cells("A2:E2")
    meta_cell = guide["A2"]
    meta_cell.value = (
        f"Model: {version_code} · Semester: 1–{max_sem} · Total: {len(courses)} mata kuliah ({required_count} wajib)"
    )
    meta_cell.fill = PatternFill("solid", fgColor="EFF6FF")
    meta_cell.font = Font(name="Calibri", size=10, bold=True, color="1E3A8A")
    meta_cell.alignment = center_align
    guide.row_dimensions[2].height = 22

    section_font = Font(name="Calibri", size=11, bold=True, color=navy)
    steps = [
        "1. Jangan mengubah nama, urutan, atau isi kolom A–C pada sheet 'Nilai' (semester, kode_mk, nama_mk).",
        "2. Isi kolom 'nilai_huruf' (kolom D) menggunakan dropdown agar sesuai dengan skala nilai resmi.",
        "3. Sel berwarna kuning muda menandakan mata kuliah WAJIB. Mata kuliah opsional boleh dikosongkan bila belum diambil.",
        "4. Simpan tetap dalam format .xlsx (tanpa rumus/formula atau makro), lalu unggah kembali di portal SI-PINAT.",
    ]
    guide["A4"] = "1. Langkah Pengisian"
    guide["A4"].font = section_font
    guide.row_dimensions[4].height = 22
    for offset, step_text in enumerate(steps, start=5):
        guide.cell(row=offset, column=1, value=f"Langkah {offset - 4}").font = Font(name="Calibri", size=10, bold=True, color="334155")
        guide.cell(row=offset, column=1).alignment = center_align
        guide.merge_cells(start_row=offset, start_column=2, end_row=offset, end_column=5)
        step_cell = guide.cell(row=offset, column=2, value=step_text)
        step_cell.font = Font(name="Calibri", size=10, color="0F172A")
        step_cell.alignment = left_wrap_align
        guide.row_dimensions[offset].height = 22

    conv_title_row = 10
    guide.cell(row=conv_title_row, column=1, value="2. Skala Konversi Nilai Resmi — Pasal 37 ayat (6) & (7)").font = section_font
    guide.row_dimensions[conv_title_row].height = 22
    conv_header_row = conv_title_row + 1
    guide.row_dimensions[conv_header_row].height = 24
    for col_idx, heading in enumerate(["Nilai Huruf", "Nilai Mutu (0–4)", "Skor Normalisasi (0–100)", "Status"], start=1):
        cell = guide.cell(row=conv_header_row, column=col_idx, value=heading)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = header_border

    fail_fill = PatternFill("solid", fgColor="FEE2E2")
    fail_font = Font(name="Calibri", size=11, bold=True, color="991B1B")
    pass_fill = PatternFill("solid", fgColor="DCFCE7")
    pass_font = Font(name="Calibri", size=11, bold=True, color="166534")

    for idx, conv in enumerate(conversions, start=conv_header_row + 1):
        guide.row_dimensions[idx].height = 21
        letter = str(conv["letter_grade"]).strip().upper()
        is_failing = letter in UNM_FAILING_GRADES
        c1 = guide.cell(row=idx, column=1, value=letter)
        c2 = guide.cell(row=idx, column=2, value=float(conv["grade_points"]))
        c3 = guide.cell(row=idx, column=3, value=float(conv["normalized_score"]))
        c4 = guide.cell(row=idx, column=4, value="Tidak Lulus" if is_failing else "Lulus")
        c2.number_format = "0.00"
        c3.number_format = "0.00"
        for col_idx, cell in enumerate((c1, c2, c3, c4), start=1):
            cell.alignment = center_align
            cell.border = cell_border
            if col_idx == 4:
                cell.fill = fail_fill if is_failing else pass_fill
                cell.font = fail_font if is_failing else pass_font
            else:
                cell.fill = zebra_fills[idx % 2]
                cell.font = code_font if col_idx == 1 else body_font

    footnote_row = conv_header_row + max(len(conversions), 1) + 1
    guide.merge_cells(start_row=footnote_row, start_column=1, end_row=footnote_row, end_column=5)
    note_cell = guide.cell(
        row=footnote_row,
        column=1,
        value="Dasar: Peraturan Rektor UNM Nomor 2 Tahun 2025 Pasal 37 ayat (6) & (7). Nilai C−, D+, D, D−, dan E dinyatakan tidak lulus.",
    )
    note_cell.font = Font(name="Calibri", size=9.5, italic=True, color="475569")
    note_cell.alignment = left_wrap_align
    guide.row_dimensions[footnote_row].height = 22

    course_title_row = footnote_row + 2
    guide.cell(row=course_title_row, column=1, value="3. Daftar Status Mata Kuliah").font = section_font
    guide.row_dimensions[course_title_row].height = 22
    course_header_row = course_title_row + 1
    guide.row_dimensions[course_header_row].height = 24
    for col_idx, heading in enumerate(["Semester", "Kode MK", "Nama Mata Kuliah", "SKS", "Status"], start=1):
        cell = guide.cell(row=course_header_row, column=col_idx, value=heading)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = header_border

    for idx, course in enumerate(courses, start=course_header_row + 1):
        guide.row_dimensions[idx].height = 22
        is_req = course["id"] in required_ids
        c1 = guide.cell(row=idx, column=1, value=int(course["semester"]))
        c2 = guide.cell(row=idx, column=2, value=export_text(course["code"]))
        c3 = guide.cell(row=idx, column=3, value=export_text(course["name"]))
        c4 = guide.cell(row=idx, column=4, value=int(course["credits"]))
        c5 = guide.cell(row=idx, column=5, value="Wajib" if is_req else "Opsional")
        c1.number_format = "0"
        c4.number_format = "0"
        c2.number_format = "@"
        row_fill = zebra_fills[idx % 2]
        for col_idx, cell in enumerate((c1, c2, c3, c4, c5), start=1):
            cell.font = code_font if col_idx in (2, 5) else body_font
            cell.alignment = left_wrap_align if col_idx == 3 else center_align
            cell.border = cell_border
            cell.fill = (required_fill if is_req else optional_fill) if col_idx == 5 else row_fill

    guide.column_dimensions["A"].width = 14
    guide.column_dimensions["B"].width = 18
    guide.column_dimensions["C"].width = 46
    guide.column_dimensions["D"].width = 14
    guide.column_dimensions["E"].width = 16
    guide.sheet_properties.pageSetUpPr.fitToPage = True
    guide.page_setup.fitToWidth = 1
    guide.page_setup.fitToHeight = 0

    workbook.active = 0
    return workbook


def template(db, assessment, format):
    master = for_assessment(db, assessment)
    courses = master["courses"]
    conversions = master["conversions"]
    required_ids = {w["course_id"] for w in master["weights"] if w["is_required"]}
    records = [dict(zip(HEADERS, [c["semester"], c["code"], c["name"], ""])) for c in courses]
    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=HEADERS, lineterminator="\r\n", quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows([{k: export_text(v) for k, v in row.items()} for row in records])
        return ("\ufeff" + output.getvalue()).encode("utf-8"), "text/csv; charset=utf-8", "template-nilai.csv"
    if format != "xlsx":
        fail(422, "Format template harus csv atau xlsx.")
    model_row = one(db, "fuzzy_model_versions", id=assessment["model_version_id"])
    version_code = model_row["version_code"] if model_row else "-"
    workbook = _build_xlsx_template(
        courses,
        conversions,
        required_ids,
        version_code,
        assessment.get("current_semester", 4),
    )
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "template-nilai.xlsx"


def export_text(value):
    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value
