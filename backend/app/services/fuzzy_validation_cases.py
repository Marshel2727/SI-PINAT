from app.repositories.store import rows, one, add, change, audit
from app.services.fuzzy_model_versions import model, invalidate, check_model
from app.core.errors import fail
from app.fuzzy.engine import calculate
from app.repositories.store import now

def listing(db, version_id):
    model(db,version_id)
    return rows(db,"fuzzy_validation_cases",model_version_id=version_id)

def save(db, version_id, body, user, identifier=None):
    model(db,version_id,draft=True,lock=True)
    if not one(db,"specializations",id=body["specialization_id"],is_active=True):
        fail(422,"Peminatan tidak dikenal.")
    before=one(db,"fuzzy_validation_cases",id=identifier,model_version_id=version_id) if identifier else None
    if identifier and not before:
        fail(404,"Skenario tidak ditemukan.")
    if identifier:
        change(db,"fuzzy_validation_cases",identifier,**body)
    else:
        identifier=add(db,"fuzzy_validation_cases",model_version_id=version_id,**body)
    invalidate(db,version_id)
    audit(db,user,"SAVE","fuzzy_validation_cases",identifier,before,body)
    return one(db,"fuzzy_validation_cases",id=identifier)

def validate(db, identifier, user):
    model(db,identifier,draft=True,lock=True)
    config, errors = check_model(db,identifier)
    if errors:
        fail(422,"Konfigurasi model belum lengkap.","MODEL_INVALID",errors)
    results = []
    for case in config["validation_cases"]:
        local = dict(config)
        local["rules"] = [r for r in config["rules"] if r["specialization_id"] == case["specialization_id"]]
        try:
            actual = calculate(float(case["academic_input"]),float(case["competency_input"]),local)["score"]
            passed = float(case["expected_min"]) <= actual <= float(case["expected_max"])
        except ValueError:
            actual,passed = None,False
        change(db,"fuzzy_validation_cases",case["id"],last_actual_score=actual,last_passed=passed,last_tested_at=now())
        results.append({"case_id":case["id"],"actual_score":actual,"passed":passed})
    audit(db,user,"VALIDATE","fuzzy_model_versions",identifier,after=results)
    return results
