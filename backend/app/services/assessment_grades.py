from app.repositories.store import rows, one, add, change, remove_where, now
from app.services.assessments import editable
from app.services.courses import for_assessment
from app.core.errors import fail
from app.fuzzy.engine import academic_score

def check(db, value, data):
    master = for_assessment(db,value)
    courses = {c["code"]:c for c in master["courses"]}
    conversions = {c["letter_grade"]:c for c in master["conversions"]}
    errors, accepted, seen = [],[],set()
    for index,row in enumerate(data,2):
        course = courses.get(str(row.get("kode_mk","")).strip())
        grade = conversions.get(str(row.get("nilai_huruf","")).strip().upper())
        error=[]
        if not course:
            error.append("Kode mata kuliah tidak dikenal/tidak berlaku untuk semester sesi.")
        else:
            if course["code"] in seen:
                error.append("Kode mata kuliah duplikat.")
            seen.add(course["code"])
            if str(row.get("semester","")) != str(course["semester"]):
                error.append("Semester berbeda dari master.")
            if str(row.get("nama_mk","")).strip().casefold() != course["name"].casefold():
                error.append("Nama berbeda dari master.")
        if not grade:
            error.append("Nilai huruf tidak ada dalam versi konversi.")
        if error:
            errors.append({"row":index,"kode_mk":str(row.get("kode_mk","")),"messages":error})
        else:
            accepted.append({"course_id":course["id"],"grade_conversion_id":grade["id"],"letter_grade":grade["letter_grade"],
                             "normalized_score":grade["normalized_score"],"credits_snapshot":course["credits"],
                             "course_snapshot":{k:course[k] for k in ["code","name","semester"]}})
    return accepted,errors

def readiness(db, value, grades=None):
    grades = grades if grades is not None else rows(db,"assessment_grades",assessment_id=value["id"])
    master = for_assessment(db,value)
    present = {g["course_id"] for g in grades}
    eligible = {c["id"]:c for c in master["courses"]}
    missing = sorted({eligible[w["course_id"]]["code"] for w in master["weights"] if w["is_required"] and w["course_id"] in eligible and w["course_id"] not in present})
    scores,errors = {},[]
    if any(g["course_id"] not in eligible for g in grades):
        errors.append("Ada nilai di luar semester sesi. Simpan ulang paket nilai yang berlaku.")
    for spec in rows(db,"specializations",is_active=True):
        weights = {str(w["course_id"]):w["weight"] for w in master["weights"] if w["specialization_id"]==spec["id"]}
        try:
            scores[spec["code"]] = academic_score(grades,weights)
        except ValueError as exc:
            errors.append(spec["code"]+": "+str(exc))
    if not value["preferred_specialization_id"]:
        errors.append("Pilih preferensi awal.")
    return {"ready":not missing and not errors,"missing_required":missing,"errors":errors,
            "academic_scores":scores,"coverage":{"provided":len(grades),"available":len(eligible)}}

def save(db, value, data, source="MANUAL", allow_incomplete=True):
    editable(value)
    grades,errors = check(db,value,data)
    state=readiness(db,value,grades)
    if errors or (not allow_incomplete and not state["ready"]):
        fail(422,"Nilai belum valid.","GRADES_INVALID",errors+[{"missing_required":state["missing_required"],"errors":state["errors"]}])
    remove_where(db,"assessment_grades",assessment_id=value["id"])
    for grade in grades:
        add(db,"assessment_grades",assessment_id=value["id"],source=source,**grade)
    change(db,"assessments",value["id"],status="ACADEMIC_READY" if state["ready"] else "DRAFT",updated_at=now())
    return {"grades":grades,**state}
