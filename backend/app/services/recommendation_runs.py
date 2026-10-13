from app.repositories.store import rows, one, add, change, now
from app.services.assessment_grades import readiness
from app.services.fuzzy_model_versions import configuration
from app.services.recommendation_scores import result
from app.fuzzy.engine import calculate, academic_score, ranks, quantize, ENGINE_VERSION
from app.core.errors import fail

def complete(db, assessment):
    if assessment["status"]=="COMPLETED":
        return result(db,assessment)
    if assessment["status"]!="IN_PROGRESS" or not readiness(db,assessment)["ready"]:
        fail(409,"Selesaikan nilai dan tes terlebih dahulu.")
    packet=rows(db,"assessment_items",assessment_id=assessment["id"])
    answers=[one(db,"assessment_answers",assessment_item_id=i["id"]) for i in packet]
    if len(packet)!=assessment["question_count"] or any(a is None for a in answers):
        fail(422,"Seluruh paket tes harus terjawab.","INCOMPLETE_TEST")
    if assessment["mode"]=="FULL" and any(a["answer_source"]!="USER" for a in answers):
        fail(422,"Asesmen FULL hanya menerima jawaban nyata.","EXAMPLE_IN_FULL")
    config=configuration(db,assessment["model_version_id"])
    grades=rows(db,"assessment_grades",assessment_id=assessment["id"])
    scored=[]
    try:
        for spec in rows(db,"specializations",is_active=True):
            weights={str(w["course_id"]):w["weight"] for w in config["course_weights"] if w["specialization_id"]==spec["id"]}
            academic=quantize(academic_score(grades,weights),4)
            item_ids={i["id"] for i in packet if one(db,"questions",id=i["question_id"])["specialization_id"]==spec["id"]}
            maximum=sum(float(i["max_points"]) for i in packet if i["id"] in item_ids)
            if not maximum:
                raise ValueError("Paket salah satu peminatan kosong.")
            competency=quantize(100*sum(float(a["awarded_points"]) for i,a in zip(packet,answers) if i["id"] in item_ids)/maximum,4)
            local={**config,"rules":[r for r in config["rules"] if r["specialization_id"]==spec["id"]]}
            trace=calculate(academic,competency,local)
            active=[r for r in trace["rule_activations"] if r["alpha"]>0]
            reason=f"Akademik {academic:.2f} dan kompetensi {competency:.2f}; {len(active)} aturan berkontribusi: "+", ".join(r["rule_code"] for r in active)+"."
            scored.append({"specialization_id":spec["id"],"specialization_code":spec["code"],"academic_score":academic,
                        "competency_score":competency,"suitability_score":trace["score"],"reason":reason,"trace":trace})
        ranked=ranks(scored)
        if len(ranked)!=3:
            raise ValueError("Wajib ada tiga hasil peminatan.")
    except (ValueError,KeyError):
        db.rollback()
        add(db,"recommendation_runs",assessment_id=assessment["id"],model_version_id=assessment["model_version_id"],
            engine_version=ENGINE_VERSION,status="FAILED",error_message="Konfigurasi/perhitungan gagal; tinjau model dan paket asesmen.",calculated_at=now())
        db.commit()
        fail(422,"Perhitungan gagal. Admin perlu memeriksa konfigurasi model.","CALCULATION_FAILED")
    run_id=add(db,"recommendation_runs",assessment_id=assessment["id"],model_version_id=assessment["model_version_id"],
            engine_version=ENGINE_VERSION,status="SUCCESS",calculated_at=now())
    for score in ranked:
        trace=score.pop("trace")
        score.pop("specialization_code")
        score_id=add(db,"recommendation_scores",run_id=run_id,**score)
        trace.pop("score")
        add(db,"fuzzy_traces",score_id=score_id,**trace)
    change(db,"assessments",assessment["id"],status="COMPLETED",completed_at=now(),updated_at=now())
    return result(db,one(db,"assessments",id=assessment["id"]))
