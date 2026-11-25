from app.repositories.store import rows, one, add, change, remove_where, audit, now
from app.services.fuzzy_model_versions import model, invalidate, check_model, configuration
from app.core.errors import fail
from app.fuzzy.engine import calculate
from app.fuzzy.reference import CASES


def listing(db, version_id):
    model(db, version_id)
    return rows(db, "fuzzy_validation_cases", model_version_id=version_id)


def save(db, version_id, body, user, identifier=None):
    model(db, version_id, draft=True, lock=True)
    if not one(db, "specializations", id=body["specialization_id"], is_active=True):
        fail(422, "Peminatan tidak dikenal.")
    before = one(
        db,
        "fuzzy_validation_cases",
        id=identifier,
        model_version_id=version_id,
    ) if identifier else None
    if identifier and not before:
        fail(404, "Skenario tidak ditemukan.")
    if identifier:
        change(db, "fuzzy_validation_cases", identifier, **body)
    else:
        identifier = add(db, "fuzzy_validation_cases", model_version_id=version_id, **body)
    invalidate(db, version_id)
    audit(db, user, "SAVE", "fuzzy_validation_cases", identifier, before, body)
    return one(db, "fuzzy_validation_cases", id=identifier)


def remove(db, version_id, identifier, user):
    model(db, version_id, draft=True, lock=True)
    before = one(db, "fuzzy_validation_cases", id=identifier, model_version_id=version_id)
    if not before:
        fail(404, "Skenario tidak ditemukan.")
    remove_where(db, "fuzzy_validation_cases", id=identifier, model_version_id=version_id)
    invalidate(db, version_id)
    audit(db, user, "DELETE", "fuzzy_validation_cases", identifier, before=before)
    return {"deleted": True, "id": identifier}


def validate(db, identifier, user):
    model(db, identifier, draft=True, lock=True)
    config, errors = check_model(db, identifier)
    if errors:
        fail(422, "Konfigurasi model belum lengkap.", "MODEL_INVALID", errors)
    results = []
    for case in config["validation_cases"]:
        local = dict(config)
        local["rules"] = [r for r in config["rules"] if r["specialization_id"] == case["specialization_id"]]
        try:
            actual = calculate(
                float(case["academic_input"]),
                float(case["competency_input"]),
                local,
            )["score"]
            passed = float(case["expected_min"]) <= actual <= float(case["expected_max"])
        except ValueError:
            actual, passed = None, False
        change(
            db,
            "fuzzy_validation_cases",
            case["id"],
            last_actual_score=actual,
            last_passed=passed,
            last_tested_at=now(),
        )
        results.append({"case_id": case["id"], "actual_score": actual, "passed": passed})
    audit(db, user, "VALIDATE", "fuzzy_model_versions", identifier, after=results)
    return results


def _unique_case_code(base_code, used_codes):
    if base_code not in used_codes:
        used_codes.add(base_code)
        return base_code
    suffix = 2
    while True:
        candidate = f"{base_code[:32 - len(str(suffix)) - 1]}-{suffix}"
        if candidate not in used_codes:
            used_codes.add(candidate)
            return candidate
        suffix += 1


def seed_boundary_cases(
    db,
    version_id,
    user,
    specialization_id=None,
    tolerance=0.5,
    recalculate_existing=False,
):
    model(db, version_id, draft=True, lock=True)
    config = configuration(db, version_id)
    specs = rows(db, "specializations", is_active=True)
    if specialization_id is not None:
        specs = [s for s in specs if s["id"] == specialization_id]
        if not specs:
            fail(422, "Peminatan tidak dikenal.")

    var_codes = {v["code"] for v in config["variables"]}
    if not {"ACADEMIC", "COMPETENCY", "SUITABILITY"}.issubset(var_codes) or not config["sets"]:
        fail(
            422,
            "Lengkapi variabel, himpunan, dan aturan fuzzy sebelum membuat skenario otomatis.",
            "MODEL_INCOMPLETE",
        )

    computed = []
    for spec in specs:
        spec_rules = [r for r in config["rules"] if r["specialization_id"] == spec["id"]]
        if not any(float(r["rule_weight"]) > 0 for r in spec_rules):
            fail(
                422,
                "Lengkapi variabel, himpunan, dan aturan fuzzy sebelum membuat skenario otomatis.",
                "MODEL_INCOMPLETE",
            )
        local = {**config, "rules": spec_rules}
        for idx, (x1, x2) in enumerate(CASES, 1):
            try:
                actual = calculate(float(x1), float(x2), local)["score"]
            except (KeyError, ValueError):
                fail(
                    422,
                    "Lengkapi variabel, himpunan, dan aturan fuzzy sebelum membuat skenario otomatis.",
                    "MODEL_INCOMPLETE",
                )
            exp_min = round(max(0.0, actual - tolerance), 5)
            exp_max = round(min(100.0, actual + tolerance), 5)
            computed.append((spec, idx, float(x1), float(x2), exp_min, exp_max))

    existing_by_key = {
        (c["specialization_id"], float(c["academic_input"]), float(c["competency_input"])): c
        for c in config["validation_cases"]
    }
    used_codes = {c["case_code"] for c in config["validation_cases"]}
    created_count = 0
    updated_count = 0

    for spec, idx, x1, x2, exp_min, exp_max in computed:
        existing = existing_by_key.get((spec["id"], x1, x2))
        if existing is None:
            case_code = _unique_case_code(f"BATAS-{spec['code']}-S{idx:02d}", used_codes)
            add(
                db,
                "fuzzy_validation_cases",
                model_version_id=version_id,
                specialization_id=spec["id"],
                case_code=case_code,
                academic_input=x1,
                competency_input=x2,
                expected_min=exp_min,
                expected_max=exp_max,
            )
            created_count += 1
        elif recalculate_existing or (
            float(existing["expected_min"]) == 0.0 and float(existing["expected_max"]) == 99.0
        ):
            change(
                db,
                "fuzzy_validation_cases",
                existing["id"],
                expected_min=exp_min,
                expected_max=exp_max,
            )
            updated_count += 1

    invalidate(db, version_id)
    audit(
        db,
        user,
        "SEED_BOUNDARY_CASES",
        "fuzzy_model_versions",
        version_id,
        after={
            "created_count": created_count,
            "updated_count": updated_count,
            "tolerance": tolerance,
        },
    )
    return {"created_count": created_count, "updated_count": updated_count, "cases": listing(db, version_id)}
