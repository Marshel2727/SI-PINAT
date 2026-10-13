"""Import original, referenced questions as DRAFT; preserve existing revisions."""

import argparse
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

from app.repositories.store import add, audit, one, rows


BANK_PATH = Path(__file__).with_name("data") / "questions_references.json"
SPECIALIZATIONS = ("ES-01", "SC-02", "JDF-03")


def load_bank():
    bank = json.loads(BANK_PATH.read_text(encoding="utf-8"))
    counts = Counter(question["specialization_code"] for question in bank["questions"])
    if counts != {code: 10 for code in SPECIALIZATIONS}:
        raise ValueError("Bank referensi harus berisi 10 soal untuk masing-masing peminatan.")
    codes = set()
    for source in bank["sources"].values():
        url = urlsplit(source["url"])
        if url.scheme != "https" or not url.netloc or not source["title"] or not source["section"]:
            raise ValueError("Referensi soal tidak lengkap.")
    for question in bank["questions"]:
        code = question["code"]
        if not code or len(code) > 32 or code in codes:
            raise ValueError(f"Kode soal tidak sah atau duplikat: {code}")
        codes.add(code)
        options = question["options"]
        if (
            len(options) != 4
            or len(set(options)) != 4
            or not all(isinstance(option, str) and option.strip() for option in options)
            or question["answer"] not in "ABCD"
            or len(question["answer"]) != 1
        ):
            raise ValueError(f"Soal {code} harus memiliki empat opsi unik dan satu kunci A-D.")
        if not all(question[key].strip() for key in ("prompt", "explanation", "topic", "level")):
            raise ValueError(f"Isi soal {code} tidak lengkap.")
        if not question["source_ids"] or any(ref not in bank["sources"] for ref in question["source_ids"]):
            raise ValueError(f"Referensi soal {code} tidak ditemukan.")
    return bank


def explanation_with_sources(question, bank):
    references = [
        f"- {bank['sources'][ref]['title']} | {bank['sources'][ref]['section']}\n"
        f"  {bank['sources'][ref]['url']}"
        for ref in question["source_ids"]
    ]
    return "\n".join([
        question["explanation"],
        "",
        f"Topik: {question['topic']}. Tingkat rancangan: {question['level']}.",
        "Soal orisinal berbasis referensi; perlu peninjauan akademik sebelum publikasi.",
        f"Referensi diperiksa: {bank['checked_at']}.",
        *references,
    ])


def seed(db, user):
    bank = load_bank()
    specializations = {}
    for code in SPECIALIZATIONS:
        specialization = one(db, "specializations", code=code, is_active=True)
        if not specialization:
            raise ValueError(f"Peminatan aktif {code} tidak ditemukan. Jalankan migrasi terlebih dahulu.")
        specializations[code] = specialization["id"]

    created = skipped = 0
    for question in bank["questions"]:
        # Any existing revision belongs to the administrator; never overwrite it.
        if rows(db, "questions", code=question["code"]):
            skipped += 1
            continue
        values = {
            "specialization_id": specializations[question["specialization_code"]],
            "code": question["code"],
            "revision": 1,
            "prompt": question["prompt"],
            "explanation": explanation_with_sources(question, bank),
            "status": "DRAFT",
        }
        identifier = add(db, "questions", **values)
        for label, option_text in zip("ABCD", question["options"]):
            add(db, "question_options", question_id=identifier, label=label,
                option_text=option_text, is_correct=label == question["answer"])
        audit(db, user, "CREATE", "questions", identifier, after=values)
        created += 1
    return created, skipped


def main():
    from app.db.session import engine

    parser = argparse.ArgumentParser(description="Tambahkan 30 soal berbasis referensi sebagai DRAFT.")
    parser.add_argument("--admin-email", required=True)
    args = parser.parse_args()
    with engine.begin() as db:
        user = one(db, "admin_users", email=args.admin_email.strip().lower(), is_active=True)
        if not user:
            raise SystemExit("Admin aktif tidak ditemukan. Gunakan email admin yang terdaftar.")
        try:
            created, skipped = seed(db, user)
        except ValueError as exc:
            raise SystemExit(str(exc))
    print(f"Bank referensi: {created} soal DRAFT ditambahkan; {skipped} kode sudah ada dan dilewati.")
    print("10 soal per peminatan; tiap soal memiliki 4 opsi, 1 kunci, pembahasan, dan referensi.")
    print("Tinjau melalui Bank Soal admin sebelum publikasi. Soal dan revisi lama tidak ditimpa.")


if __name__ == "__main__":
    main()
