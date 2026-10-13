import io
from xml.sax.saxutils import escape
from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from app.repositories.store import rows, one, table
from app.core.errors import fail
from app.services.transcript_imports import export_text
from sqlalchemy import select, func

def result(db, assessment):
    runs=sorted(rows(db,"recommendation_runs",assessment_id=assessment["id"],status="SUCCESS"),key=lambda r:r["id"],reverse=True)
    if not runs:
        fail(409,"Hasil belum tersedia. Selesaikan asesmen terlebih dahulu.","RESULT_NOT_READY")
    run=runs[0]
    scores=[]
    for row in rows(db,"recommendation_scores",run_id=run["id"]):
        spec=one(db,"specializations",id=row["specialization_id"])
        scores.append({**row,"specialization_code":spec["code"],"specialization_name":spec["name"]})
    scores.sort(key=lambda s:(s["rank_position"],s["specialization_code"]))
    top=[s["specialization_code"] for s in scores if s["rank_position"]==1]
    preferred=next((s for s in scores if s["specialization_id"]==assessment["preferred_specialization_id"]),None)
    items=rows(db,"assessment_items",assessment_id=assessment["id"])
    answers=[one(db,"assessment_answers",assessment_item_id=i["id"]) for i in items]
    return {"assessment_id":assessment["public_id"],"run_id":run["id"],"mode":assessment["mode"],
            "model_version":one(db,"fuzzy_model_versions",id=run["model_version_id"])["version_code"],
            "engine_version":run["engine_version"],"scores":scores,"top_specialization_codes":top,"has_tie":len(top)>1,
            "preferred_specialization_code":preferred["specialization_code"] if preferred else None,
            "preference_comparison":{"matches_top":preferred["rank_position"]==1,
                                    "gap_to_top":float(scores[0]["suitability_score"])-float(preferred["suitability_score"])} if preferred else None,
            "answer_sources":{"USER":sum(a and a["answer_source"]=="USER" for a in answers),
                            "EXAMPLE":sum(a and a["answer_source"]=="EXAMPLE" for a in answers)},
            "completed_at":assessment["completed_at"]}

def filtered_query(mode=None, status=None, date_from=None, date_to=None):
    t=table("assessments")
    query=select(t)
    if mode:
        if mode not in {"DEMO","FULL"}:
            fail(422,"Mode filter tidak dikenal.")
        query=query.where(t.c.mode==mode)
    if status:
        if status not in {"DRAFT","ACADEMIC_READY","IN_PROGRESS","COMPLETED"}:
            fail(422,"Status filter tidak dikenal.")
        query=query.where(t.c.status==status)
    if date_from:
        query=query.where(t.c.created_at>=date_from)
    if date_to:
        query=query.where(t.c.created_at<date_to)
    return query

def listing(db, page=1, page_size=20, **filters):
    query=filtered_query(**filters)
    total=db.execute(select(func.count()).select_from(query.subquery())).scalar()
    records=list(db.execute(query.order_by(table("assessments").c.id.desc()).offset((page-1)*page_size).limit(page_size)).mappings())
    output=[]
    for assessment in records:
        student=one(db,"students",id=assessment["student_id"]) if assessment["student_id"] else None
        output.append({**assessment,"student":student,"result":result(db,assessment) if assessment["status"]=="COMPLETED" else None})
    return output,total

def dashboard(db, **filters):
    query=filtered_query(**filters)
    t=query.subquery()
    total=db.execute(select(func.count()).select_from(t)).scalar()
    modes={key:db.execute(select(func.count()).select_from(t).where(t.c.mode==key)).scalar() for key in ["DEMO","FULL"]}
    completed=db.execute(select(func.count()).select_from(t).where(t.c.status=="COMPLETED")).scalar()
    s,r,a=table("recommendation_scores"),table("recommendation_runs"),table("assessments")
    dist_query=select(s.c.specialization_id,func.count().label("total")).select_from(s.join(r,s.c.run_id==r.c.id).join(t,r.c.assessment_id==t.c.id)).where(s.c.rank_position==1,r.c.status=="SUCCESS").group_by(s.c.specialization_id)
    distribution=[{**row,"name":one(db,"specializations",id=row["specialization_id"])["name"]} for row in db.execute(dist_query).mappings()]
    return {"total_assessments":total,"modes":modes,"completed":completed,
            "total_courses":db.execute(select(func.count()).select_from(table("courses"))).scalar(),
            "total_questions":db.execute(select(func.count()).select_from(table("questions")).where(table("questions").c.status=="PUBLISHED")).scalar(),
            "total_models":db.execute(select(func.count()).select_from(table("fuzzy_model_versions"))).scalar(),
            "total_cases":db.execute(select(func.count()).select_from(table("fuzzy_validation_cases"))).scalar(),
            "distribution":distribution,"distribution_note":"Hasil seri dihitung pada setiap peminatan teratas."}

def report_pdf(db, assessment):
    value=result(db,assessment)
    output=io.BytesIO()
    document=SimpleDocTemplate(output,title="Hasil SI-PINAT",author="SI-PINAT")
    styles=getSampleStyleSheet()
    story=[Paragraph("SI-PINAT - Ringkasan Rekomendasi",styles["Title"]),Spacer(1,16)]
    for text in ["Mode: "+value["mode"]+(" - DATA CONTOH" if value["mode"]=="DEMO" else ""),
                "Sesi: "+assessment["public_id"],"Model: "+value["model_version"]+" | Engine: "+value["engine_version"],
                "Waktu UTC: "+str(value["completed_at"]),"Jawaban USER / EXAMPLE: "+str(value["answer_sources"]),
                "Rekomendasi teratas"+(" (seri)" if value["has_tie"] else "")+": "+", ".join(value["top_specialization_codes"])]:
        story.append(Paragraph(escape(text),styles["Normal"]))
        story.append(Spacer(1,8))
    data=[["Peminatan","Akademik","Kompetensi","Kesesuaian","Peringkat"]]
    for score in value["scores"]:
        data.append([Paragraph(escape(score["specialization_name"]),styles["Normal"])]+[f"{float(score[key]):.2f}".replace(".",",") for key in ["academic_score","competency_score","suitability_score"]]+[str(score["rank_position"])])
    grid=Table(data,colWidths=[175,65,70,70,60],repeatRows=1)
    grid.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#EAEDFF")),("GRID",(0,0),(-1,-1),0.5,colors.lightgrey),("VALIGN",(0,0),(-1,-1),"TOP"),("BOTTOMPADDING",(0,0),(-1,-1),10)]))
    story.extend([Spacer(1,16),grid,Spacer(1,16)])
    for score in value["scores"]:
        story.append(Paragraph(escape(score["specialization_name"]+": "+score["reason"]),styles["Normal"]))
        story.append(Spacer(1,10))
    story.append(Paragraph("Akademik = sum(nilai normalisasi x SKS x bobot) / sum(SKS x bobot). Preferensi awal hanya pembanding. Hasil merupakan bahan konsultasi akademik, bukan jaminan karier atau keputusan resmi.",styles["Normal"]))
    document.build(story)
    return output.getvalue()

def export(db, **filters):
    workbook=Workbook()
    sheet=workbook.active
    sheet.title="Asesmen"
    sheet.append(["Sesi","Mode","Status","NIM","Nama","Model","Peminatan","Akademik","Kompetensi","Kesesuaian","Peringkat","Selesai UTC"])
    query=filtered_query(**filters).order_by(table("assessments").c.id)
    for assessment in db.execute(query).mappings():
        student=one(db,"students",id=assessment["student_id"]) if assessment["student_id"] else None
        value=result(db,assessment) if assessment["status"]=="COMPLETED" else None
        for score in value["scores"] if value else [{}]:
            row=[assessment["public_id"],assessment["mode"],assessment["status"],student["nim"] if student else "",student["full_name"] if student else "",
                value["model_version"] if value else "",score.get("specialization_name",""),float(score["academic_score"]) if score else "",
                float(score["competency_score"]) if score else "",float(score["suitability_score"]) if score else "",
                score.get("rank_position",""),str(assessment["completed_at"] or "")]
            sheet.append([export_text(v) for v in row])
    sheet.freeze_panes="A2"
    sheet.auto_filter.ref=sheet.dimensions
    for column in sheet.columns:
        sheet.column_dimensions[column[0].column_letter].width=24
    output=io.BytesIO()
    workbook.save(output)
    return output.getvalue()
