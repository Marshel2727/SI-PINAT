from app.repositories.store import one, rows
from app.services.recommendation_scores import result
from app.core.errors import fail

def trace(db, assessment, code):
    value=result(db,assessment)
    score=next((s for s in value["scores"] if s["specialization_code"]==code),None)
    if not score:
        fail(422,"Kode peminatan tidak dikenal.")
    stored=one(db,"fuzzy_traces",score_id=score["id"])
    if not stored:
        fail(409,"Jejak perhitungan belum tersedia.")
    # Read the model pinned to this assessment, never the latest global model.
    variables = rows(db, "fuzzy_variables", model_version_id=assessment["model_version_id"])
    fields = ("code", "shape", "point_a", "point_b", "point_c", "point_d")
    input_sets = {
        variable["code"]: [{key: item[key] for key in fields}
                           for item in rows(db, "fuzzy_sets", variable_id=variable["id"])]
        for variable in variables if variable["code"] in {"ACADEMIC", "COMPETENCY"}
    }
    return {**stored,"input_sets":input_sets,"score":score,"model_version":value["model_version"],"engine_version":value["engine_version"],"mode":value["mode"]}
