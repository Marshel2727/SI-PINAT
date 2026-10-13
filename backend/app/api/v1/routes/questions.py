from fastapi import APIRouter, Depends, Query
from app.db.session import database
from app.core.security import admin
from app.schemas.inputs import Question
from app.services import questions
from app.api.v1.common import ok, page as envelope

router=APIRouter(tags=["questions"],dependencies=[Depends(admin)])

@router.get("/admin/questions")
def listing(status:str|None=None,specialization_id:int|None=None,search:str=Query("",max_length=200),page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100),db=Depends(database)):
    data=questions.listing(db,status,specialization_id,search.strip())
    return envelope(data[(page-1)*page_size:page*page_size],page,page_size,len(data))

@router.get("/admin/questions/summary")
def summary(db=Depends(database)):
    return ok(questions.published_summary(db))

@router.post("/admin/questions",status_code=201)
def create(body:Question,user=Depends(admin),db=Depends(database)):
    return ok(questions.save(db,body.model_dump(),user))

@router.get("/admin/questions/{identifier}")
def detail(identifier:int,db=Depends(database)):
    return ok(questions.detail(db,identifier))

@router.patch("/admin/questions/{identifier}")
def edit(identifier:int,body:Question,user=Depends(admin),db=Depends(database)):
    return ok(questions.save(db,body.model_dump(),user,identifier))

@router.post("/admin/questions/{identifier}/revisions",status_code=201)
def revision(identifier:int,user=Depends(admin),db=Depends(database)):
    return ok(questions.revision(db,identifier,user))

@router.post("/admin/questions/{identifier}/publish")
def publish(identifier:int,user=Depends(admin),db=Depends(database)):
    return ok(questions.set_status(db,identifier,"PUBLISHED",user))

@router.post("/admin/questions/{identifier}/archive")
def archive(identifier:int,user=Depends(admin),db=Depends(database)):
    return ok(questions.set_status(db,identifier,"ARCHIVED",user))
