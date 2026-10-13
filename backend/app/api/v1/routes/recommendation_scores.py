from datetime import datetime
from fastapi import APIRouter, Depends, Request, Query
from app.db.session import database
from app.core.security import owned, admin
from app.services import recommendation_scores as scores
from app.services.assessments import summary
from app.repositories.store import one, rows
from app.core.errors import fail
from app.api.v1.common import ok, page as envelope, download

router=APIRouter(tags=["recommendation_scores"])

@router.get("/assessments/{public_id}/result")
def result(public_id:str,request:Request,db=Depends(database)):
    return ok(scores.result(db,owned(db,request,public_id)))

@router.get("/assessments/{public_id}/result/report.pdf")
def report(public_id:str,request:Request,db=Depends(database)):
    return download(scores.report_pdf(db,owned(db,request,public_id)),"application/pdf","hasil-sipinat.pdf")

@router.get("/admin/dashboard")
def dashboard(mode:str|None=None,date_from:datetime|None=None,date_to:datetime|None=None,user=Depends(admin),db=Depends(database)):
    return ok(scores.dashboard(db,mode=mode,date_from=date_from,date_to=date_to))

@router.get("/admin/assessments")
def listing(mode:str|None=None,status:str|None=None,date_from:datetime|None=None,date_to:datetime|None=None,
            page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100),user=Depends(admin),db=Depends(database)):
    data,total=scores.listing(db,page,page_size,mode=mode,status=status,date_from=date_from,date_to=date_to)
    return envelope(data,page,page_size,total)

@router.get("/admin/assessments/{public_id}")
def detail(public_id:str,user=Depends(admin),db=Depends(database)):
    assessment=one(db,"assessments",public_id=public_id)
    if not assessment:
        fail(404,"Asesmen tidak ditemukan.")
    return ok({"assessment":summary(db,assessment),"grades":rows(db,"assessment_grades",assessment_id=assessment["id"]),
               "result":scores.result(db,assessment) if assessment["status"]=="COMPLETED" else None})

@router.get("/admin/reports/assessments.xlsx")
def export(mode:str|None=None,status:str|None=None,date_from:datetime|None=None,date_to:datetime|None=None,user=Depends(admin),db=Depends(database)):
    return download(scores.export(db,mode=mode,status=status,date_from=date_from,date_to=date_to),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","asesmen-sipinat.xlsx")
