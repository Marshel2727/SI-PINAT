"""Seed a reviewable Mamdani draft using the 32 ACO course masters."""

import argparse
import json
import math
from pathlib import Path

from app.fuzzy.reference import CASES, CONSEQUENTS, PARAMETERS, exact_reference
from app.repositories.store import add, audit, one, rows


PROPOSAL_PATH = Path(__file__).with_name("data") / "fuzzy_model_proposal.json"
SPECIALIZATIONS = ("ES-01", "SC-02", "JDF-03")
LETTERS = (("A", 4), ("B", 3), ("C", 2), ("D", 1), ("E", 0))


def load_proposal():
    proposal = json.loads(PROPOSAL_PATH.read_text(encoding="utf-8"))
    courses = proposal["course_weights"]
    if len(courses) != 32 or len({course["code"] for course in courses}) != 32:
        raise ValueError("Usulan harus memuat 32 kode mata kuliah unik.")
    for course in courses:
        weights = course["weights"]
        if set(weights) != set(SPECIALIZATIONS) or any(
            not isinstance(weight, (int, float)) or not math.isfinite(weight) or not 0 <= weight <= 1
            for weight in weights.values()
        ):
            raise ValueError(f"Bobot tidak sah untuk {course['code']}.")
    if not proposal["academic_review_required"] or proposal["status"] != "DRAFT":
        raise ValueError("Usulan awal wajib DRAFT dan memerlukan peninjauan akademik.")
    return proposal


def seed(db, user):
    proposal = load_proposal()
    existing = one(db, "fuzzy_model_versions", version_code=proposal["version_code"])
    if existing:
        return existing["id"], False

    specs = rows(db, "specializations", is_active=True)
    if {spec["code"] for spec in specs} != set(SPECIALIZATIONS):
        raise ValueError("Tiga peminatan aktif ES-01, SC-02, JDF-03 harus tersedia.")
    courses = rows(db, "courses", is_active=True)
    by_code = {course["code"]: course for course in courses}
    proposed_weights = {course["code"]: course["weights"] for course in proposal["course_weights"]}
    missing = sorted(set(proposed_weights) - set(by_code))
    if missing:
        raise ValueError(
            "Master mata kuliah belum lengkap/aktif: " + ", ".join(missing)
            + ". Jalankan seed_courses atau periksa master melalui admin terlebih dahulu."
        )

    identifier = add(db, "fuzzy_model_versions", version_code=proposal["version_code"],
                     method="MAMDANI", defuzzification="CENTROID", sampling_step=0.1,
                     status="DRAFT", created_by=user["id"])
    for course in courses:
        for spec in specs:
            weight = proposed_weights.get(course["code"], {}).get(spec["code"], 0)
            add(db, "course_weights", model_version_id=identifier, course_id=course["id"],
                specialization_id=spec["id"], weight=weight, is_required=weight > 0)

    for letter, points in LETTERS:
        add(db, "grade_conversions", model_version_id=identifier, letter_grade=letter,
            grade_points=points, normalized_score=points * 25)

    set_ids = {}
    for code in ("ACADEMIC", "COMPETENCY", "SUITABILITY"):
        variable_id = add(db, "fuzzy_variables", model_version_id=identifier, code=code,
                          direction="OUTPUT" if code == "SUITABILITY" else "INPUT",
                          domain_min=0, domain_max=100)
        for label, (shape, points) in PARAMETERS.items():
            set_ids[(code, label)] = add(
                db, "fuzzy_sets", variable_id=variable_id, code=label, shape=shape,
                **dict(zip(("point_a", "point_b", "point_c", "point_d"), points)),
            )

    labels = ("LOW", "MEDIUM", "HIGH")
    for spec in specs:
        for i, academic in enumerate(labels):
            for j, competency in enumerate(labels):
                add(db, "fuzzy_rules", model_version_id=identifier, specialization_id=spec["id"],
                    rule_code=f"R{i * 3 + j + 1}", academic_set_id=set_ids[("ACADEMIC", academic)],
                    competency_set_id=set_ids[("COMPETENCY", competency)],
                    output_set_id=set_ids[("SUITABILITY", CONSEQUENTS[i][j])],
                    operator="AND", rule_weight=1)
        for index, (academic, competency) in enumerate(CASES, 1):
            expected = exact_reference(academic, competency)
            add(db, "fuzzy_validation_cases", model_version_id=identifier, specialization_id=spec["id"],
                case_code=f"TECH-S{index:02d}", academic_input=academic, competency_input=competency,
                expected_min=round(max(0, expected - 0.002), 5),
                expected_max=round(min(100, expected + 0.002), 5))

    extra_codes = sorted(set(by_code) - set(proposed_weights))
    audit(db, user, "SEED_FUZZY_MODEL", "fuzzy_model_versions", identifier, after={
        "proposal": proposal,
        "extra_active_courses_zero_weight": extra_codes,
        "parameters": {code: {"shape": shape, "points": points} for code, (shape, points) in PARAMETERS.items()},
        "consequents": CONSEQUENTS,
        "technical_cases": len(CASES) * len(specs),
        "academic_review_confirmed": False,
    })
    return identifier, True


def main():
    from app.db.session import engine

    parser = argparse.ArgumentParser(description="Buat model fuzzy TEKOM-ACO-001 sebagai DRAFT untuk ditinjau.")
    parser.add_argument("--admin-email", required=True)
    args = parser.parse_args()
    with engine.begin() as db:
        user = one(db, "admin_users", email=args.admin_email.strip().lower(), is_active=True)
        if not user:
            raise SystemExit("Admin aktif tidak ditemukan. Gunakan email admin yang terdaftar.")
        try:
            identifier, created = seed(db, user)
        except ValueError as exc:
            raise SystemExit(str(exc))
    if not created:
        print(f"Model TEKOM-ACO-001 (ID {identifier}) sudah ada; konfigurasi tidak ditimpa.")
        return
    print(f"Model TEKOM-ACO-001 DRAFT dibuat (ID {identifier}).")
    print("32 mata kuliah ACO; 3 variabel; 9 himpunan; 27 aturan; 5 konversi; 30 skenario teknis.")
    print("Bobot/konversi/batas fuzzy merupakan usulan awal, belum disahkan secara akademik.")
    print("Tinjau konfigurasi dan soal, jalankan skenario melalui admin, lalu publikasikan setelah persetujuan.")


if __name__ == "__main__":
    main()
