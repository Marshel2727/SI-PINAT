from fastapi import APIRouter, Depends, Query
from app.db.session import database
from app.core.security import admin
from app.schemas.inputs import BoundarySeed, ModelCreate, Publish
from app.repositories.store import rows, add, audit
from app.services import fuzzy_model_versions as models
from app.api.v1.common import ok, page as envelope
from app.services.fuzzy_validation_cases import seed_boundary_cases, validate as run_validation

router = APIRouter(tags=["fuzzy_model_versions"], dependencies=[Depends(admin)])


@router.get("/admin/fuzzy-models")
def listing(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db=Depends(database),


):
    data = sorted(rows(db, "fuzzy_model_versions"), key=lambda m: m["id"], reverse=True)
    return envelope(data[(page - 1) * page_size:page * page_size], page, page_size, len(data))


@router.post("/admin/fuzzy-models", status_code=201)
def create(body: ModelCreate, user=Depends(admin), db=Depends(database)):
    identifier = add(
        db,
        "fuzzy_model_versions",
        **body.model_dump(),
        method="MAMDANI",
        defuzzification="CENTROID",
        status="DRAFT",
        created_by=user["id"],
    )
    audit(db, user, "CREATE", "fuzzy_model_versions", identifier, after=body.model_dump())
    return ok(models.configuration(db, identifier))


@router.get("/admin/fuzzy-models/{identifier}")
def detail(identifier: int, db=Depends(database)):
    return ok(models.configuration(db, identifier))


@router.post("/admin/fuzzy-models/{identifier}/clone", status_code=201)
def clone(identifier: int, body: ModelCreate, user=Depends(admin), db=Depends(database)):
    return ok(models.clone(db, identifier, body.model_dump(), user))


@router.post("/admin/fuzzy-models/{identifier}/scaffold-defaults")
def scaffold_defaults(identifier: int, user=Depends(admin), db=Depends(database)):
    return ok(models.scaffold_defaults(db, identifier, user))


@router.get("/admin/fuzzy-models/{identifier}/readiness")
def readiness(identifier: int, db=Depends(database)):
    return ok(models.publication_readiness(db, identifier))


@router.post("/admin/fuzzy-models/{identifier}/validate")
def validate(identifier: int, user=Depends(admin), db=Depends(database, scope="function")):
    return ok(run_validation(db, identifier, user))


@router.post("/admin/fuzzy-models/{identifier}/seed-boundary-cases")
def seed_boundary(
    identifier: int,
    body: BoundarySeed | None = None,
    user=Depends(admin),
    db=Depends(database, scope="function"),
):
    payload = body or BoundarySeed()
    return ok(seed_boundary_cases(
        db,
        identifier,
        user,
        specialization_id=payload.specialization_id,
        tolerance=payload.tolerance,
        recalculate_existing=payload.recalculate_existing,
    ))


@router.post("/admin/fuzzy-models/{identifier}/publish")
def publish(
    identifier: int,
    body: Publish,
    user=Depends(admin),
    db=Depends(database, scope="function"),


):
    return ok(models.publish(db, identifier, body.academic_review_confirmed, user))
