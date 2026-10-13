from fastapi import APIRouter, Depends, Request, Query
from app.db.session import database
from app.core.security import admin, owned
from app.schemas.inputs import Course
from app.services import courses
from app.api.v1.common import ok, page as envelope

router=APIRouter(tags=["courses"])

@router.get("/assessments/{public_id}/courses")
def assessment_courses(public_id:str,request:Request,db=Depends(database)):
    return ok(courses.for_assessment(db,owned(db,request,public_id)))

@router.get("/admin/courses")
def listing(search:str=Query("",max_length=150),semester:int|None=Query(None,ge=1,le=4),sort:str="code",
            page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100),user=Depends(admin),db=Depends(database)):
    values=courses.listing(db,search,semester,sort)
    return envelope(values[(page-1)*page_size:page*page_size],page,page_size,len(values))

@router.post("/admin/courses",status_code=201)
def create(body:Course,user=Depends(admin),db=Depends(database)):
    return ok(courses.save(db,body.model_dump(),user))

@router.patch("/admin/courses/{identifier}")
def edit(identifier:int,body:Course,user=Depends(admin),db=Depends(database)):
    return ok(courses.save(db,body.model_dump(),user,identifier))
