"""Import master Teknik Komputer semester I-IV from the supplied ACO guide.

Source: Buku Panduan Academic Culture Orientation Volume 7.pdf,
printed pages 64-65 (PDF pages 73-74). Codes and names follow the source,
including the code 21B10C101 for Rangkaian Elektronika.
"""

import argparse

from app.db.session import engine
from app.repositories.store import add, audit, one


COURSES = (
    ("21B10C101", "Rangkaian Elektronika", 1, 3),
    ("21B01C102", "Algoritme & Pemrograman Dasar", 1, 3),
    ("21B01C103", "Bahasa Indonesia", 1, 2),
    ("21B01C104", "Aljabar Linear I", 1, 3),
    ("21B01C105", "Pendidikan Pancasila", 1, 2),
    ("21B01C106", "Pengantar Teknik Komputer", 1, 3),
    ("21B01C107", "Bahasa Inggris", 1, 3),
    ("21B01C108", "Sistem Digital", 1, 3),
    ("21B01C201", "Arsitektur & Organisasi Komputer", 2, 3),
    ("21B01C202", "Aljabar Linear II", 2, 3),
    ("21B01C203", "Pendidikan Kewarganegaraan", 2, 2),
    ("21B01C204", "Struktur Data + Lab", 2, 3),
    ("21B01C205", "Pendidikan Agama", 2, 2),
    ("21B01C206", "Basis Data + Lab", 2, 3),
    ("21B01C207", "Sistem Operasi", 2, 3),
    ("21B01C208", "Jaringan Komputer + Lab", 2, 3),
    ("21B01C301", "Pemrograman Lanjut", 3, 3),
    ("21B01C302", "Sistem Mikroprosessor + Lab", 3, 3),
    ("21B01C303", "Analisis dan Desain Algoritme", 3, 3),
    ("21B01C304", "Matematika Diskrit", 3, 3),
    ("21B01C305", "Inovasi Teknologi", 3, 2),
    ("21B01C306", "Kecerdasan Buatan", 3, 3),
    ("21B01C307", "Pemrograman WEB", 3, 3),
    ("21B01C308", "Desain Antarmuka Pengguna", 3, 3),
    ("21B01C401", "Etika Profesi", 4, 2),
    ("21B01C402", "Statistik dan Probabilitas", 4, 3),
    ("21B01C403", "Pemodelan dan Metode Numerik", 4, 3),
    ("21B01C404", "Keamanan Informasi", 4, 3),
    ("21B01C405", "IoT", 4, 3),
    ("21B01C406", "Rekayasa Perangkat Lunak", 4, 3),
    ("21B01C407", "Pemrograman Mobile", 4, 3),
    ("21B01C408", "Logika Fuzzy", 4, 3),
)


def seed(db, user):
    pending = []
    for code, name, semester, credits in COURSES:
        existing = one(db, "courses", code=code)
        values = {"code": code, "name": name, "semester": semester, "credits": credits}
        if existing:
            if any(existing[key] != value for key, value in values.items()):
                raise ValueError(
                    f"Kode {code} sudah ada dengan metadata berbeda. "
                    "Impor dibatalkan tanpa menimpa data; periksa master melalui admin."
                )
        else:
            pending.append(values)

    for values in pending:
        identifier = add(db, "courses", **values, is_active=True)
        audit(db, user, "CREATE", "courses", identifier, after={**values, "is_active": True})

    return len(pending), len(COURSES) - len(pending)


def main():
    parser = argparse.ArgumentParser(description="Isi master Teknik Komputer semester I-IV dari panduan ACO.")
    parser.add_argument("--admin-email", required=True)
    args = parser.parse_args()
    with engine.begin() as db:
        user = one(db, "admin_users", email=args.admin_email.strip().lower(), is_active=True)
        if not user:
            raise SystemExit("Admin aktif tidak ditemukan. Buat admin atau gunakan email admin yang terdaftar.")
        try:
            created, skipped = seed(db, user)
        except ValueError as exc:
            raise SystemExit(str(exc))

    print(f"Master Teknik Komputer: {created} ditambahkan, {skipped} sudah ada; 32 mata kuliah, 90 SKS.")
    print("Semester I: 8 MK / 22 SKS; II: 8 / 22; III: 8 / 23; IV: 8 / 23.")
    print("Bobot model dan mata kuliah contoh DEMO tidak diubah.")


if __name__ == "__main__":
    main()
