from itertools import product
from sqlalchemy import select, update
from app.repositories.store import one, rows, add, change, remove_where, table, audit, now
from app.core.errors import fail
from app.fuzzy.engine import membership, calculate

def model(db, identifier, draft=False, lock=False):
    query = select(table("fuzzy_model_versions")).where(table("fuzzy_model_versions").c.id == identifier)
    if lock:
        query = query.with_for_update()
    value = db.execute(query).mappings().first()
    if not value:
        fail(404,"Versi model tidak ditemukan.","NOT_FOUND")
    if draft and value["status"] != "DRAFT":
        fail(409,"Model terpublikasi terkunci. Kloning menjadi draft baru.","IMMUTABLE_MODEL")
    return value

def configuration(db, identifier, specialization_id=None):
    value = dict(model(db,identifier))
    value["variables"] = rows(db,"fuzzy_variables",model_version_id=identifier)
    ids = [v["id"] for v in value["variables"]]
    value["sets"] = list(db.execute(select(table("fuzzy_sets")).where(table("fuzzy_sets").c.variable_id.in_(ids))).mappings())
    value["rules"] = rows(db,"fuzzy_rules",model_version_id=identifier,**({"specialization_id":specialization_id} if specialization_id else {}))
    value["course_weights"] = rows(db,"course_weights",model_version_id=identifier)
    value["grade_conversions"] = rows(db,"grade_conversions",model_version_id=identifier)
    value["validation_cases"] = rows(db,"fuzzy_validation_cases",model_version_id=identifier)
    return value

def invalidate(db, identifier):
    db.execute(update(table("fuzzy_validation_cases")).where(table("fuzzy_validation_cases").c.model_version_id == identifier)
               .values(last_passed=None,last_actual_score=None,last_tested_at=None))

def clone(db, identifier, body, user):
    old = configuration(db,identifier)
    new = add(db,"fuzzy_model_versions",**body,method="MAMDANI",defuzzification="CENTROID",status="DRAFT",created_by=user["id"])
    for section,name in [("course_weights","course_weights"),("grade_conversions","grade_conversions")]:
        for row in old[section]:
            add(db,name,model_version_id=new,**{k:v for k,v in row.items() if k not in {"id","model_version_id"}})
    variable_ids, set_ids = {}, {}
    for row in old["variables"]:
        variable_ids[row["id"]] = add(db,"fuzzy_variables",model_version_id=new,**{k:v for k,v in row.items() if k not in {"id","model_version_id"}})
    for row in old["sets"]:
        set_ids[row["id"]] = add(db,"fuzzy_sets",variable_id=variable_ids[row["variable_id"]],**{k:v for k,v in row.items() if k not in {"id","variable_id"}})
    for row in old["rules"]:
        value = {k:v for k,v in row.items() if k not in {"id","model_version_id"}}
        for field in ["academic_set_id","competency_set_id","output_set_id"]:
            value[field] = set_ids[value[field]]
        add(db,"fuzzy_rules",model_version_id=new,**value)
    for row in old["validation_cases"]:
        add(db,"fuzzy_validation_cases",model_version_id=new,**{k:v for k,v in row.items() if k not in {"id","model_version_id","last_actual_score","last_passed","last_tested_at"}})
    audit(db,user,"CLONE","fuzzy_model_versions",new,after={"source_id":identifier})
    return configuration(db,new)

def check_model(db, identifier):
    config = configuration(db,identifier)
    errors = []
    variables = {v["code"]:v for v in config["variables"]}
    if set(variables) != {"ACADEMIC","COMPETENCY","SUITABILITY"}:
        errors.append("Lengkapi tiga variabel.")
    for code,v in variables.items():
        group = [s for s in config["sets"] if s["variable_id"] == v["id"]]
        if {s["code"] for s in group} != {"LOW","MEDIUM","HIGH"} or len(group) != 3:
            errors.append(code + ": wajib LOW, MEDIUM, HIGH.")
            continue
        if float(v["domain_min"]) != 0 or float(v["domain_max"]) != 100:
            errors.append(code + ": domain skor wajib mencakup 0-100.")
        knots = sorted({float(v["domain_min"]),float(v["domain_max"])} | {float(s[k]) for s in group for k in ["point_a","point_b","point_c","point_d"] if s[k] is not None})
        samples = knots + [(a+b)/2 for a,b in zip(knots,knots[1:])]
        try:
            if any(max(membership(x,s) for s in group) <= 0 for x in samples if float(v["domain_min"]) <= x <= float(v["domain_max"])):
                errors.append(code + ": domain memiliki celah keanggotaan.")
        except ValueError as exc:
            errors.append(str(exc))
    specs = rows(db,"specializations",is_active=True)
    set_ids = {s["id"]:s for s in config["sets"]}
    for spec in specs:
        relevant = [r for r in config["rules"] if r["specialization_id"] == spec["id"]]
        combos = set()
        for r in relevant:
            try:
                for key,role in [("academic_set_id","ACADEMIC"),("competency_set_id","COMPETENCY"),("output_set_id","SUITABILITY")]:
                    if set_ids[r[key]]["variable_id"] != variables[role]["id"]:
                        raise KeyError(role)
                if float(r["rule_weight"]) > 0:
                    combos.add((set_ids[r["academic_set_id"]]["code"],set_ids[r["competency_set_id"]]["code"]))
            except KeyError:
                errors.append(spec["code"] + ": peran/versi set aturan salah.")
        if combos != set(product(["LOW","MEDIUM","HIGH"],repeat=2)):
            errors.append(spec["code"] + ": sembilan kombinasi aturan positif wajib lengkap.")
        weights = [w for w in config["course_weights"] if w["specialization_id"] == spec["id"]]
        if not weights or sum(float(w["weight"]) for w in weights) <= 0:
            errors.append(spec["code"] + ": bobot akademik belum lengkap.")
    active_courses = rows(db,"courses",is_active=True)
    matrix = {(w["course_id"],w["specialization_id"]) for w in config["course_weights"]}
    if not active_courses or any((c["id"],s["id"]) not in matrix for c in active_courses for s in specs):
        errors.append("Matriks bobot setiap mata kuliah aktif / tiga peminatan wajib lengkap.")
    if not config["grade_conversions"]:
        errors.append("Konversi nilai kosong.")
    return config,errors

def publish(db, identifier, confirmed, user):
    model(db,identifier,draft=True,lock=True)
    config,errors = check_model(db,identifier)
    required_inputs = {(0,0),(50,50),(90,90),(100,100),(0,90),(90,0),(25,25),(70,70),(40,60),(20,80)}
    for spec in rows(db,"specializations",is_active=True):
        cases = [c for c in config["validation_cases"] if c["specialization_id"] == spec["id"]]
        inputs = {(float(c["academic_input"]),float(c["competency_input"])) for c in cases}
        if not required_inputs.issubset(inputs) or any(not c["last_passed"] or not c["last_tested_at"] for c in cases):
            errors.append(spec["code"] + ": sepuluh skenario batas/overlap wajib ada dan semua skenario harus lulus.")
        questions = rows(db,"questions",specialization_id=spec["id"],status="PUBLISHED")
        if len({q["code"] for q in questions}) < 10:
            errors.append(spec["code"] + ": minimal sepuluh soal terpublikasi.")
    if not confirmed:
        errors.append("Konfirmasi peninjauan akademik sebelum publikasi.")
    if errors:
        fail(422,"Model belum dapat dipublikasikan.","PUBLISH_BLOCKED",errors)
    change(db,"fuzzy_model_versions",identifier,status="PUBLISHED",published_at=now())
    audit(db,user,"PUBLISH","fuzzy_model_versions",identifier,after={"academic_review_confirmed":True})
    return model(db,identifier)
