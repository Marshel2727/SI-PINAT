from app.repositories.store import one
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
    return {**stored,"score":score,"model_version":value["model_version"],"engine_version":value["engine_version"],"mode":value["mode"]}
