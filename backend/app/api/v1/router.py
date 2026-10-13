from fastapi import APIRouter, Depends
from app.core.security import csrf
from app.api.v1.routes import admin_sessions
from app.api.v1.routes import admin_users
from app.api.v1.routes import assessments
from app.api.v1.routes import assessment_answers
from app.api.v1.routes import assessment_grades
from app.api.v1.routes import assessment_items
from app.api.v1.routes import audit_logs
from app.api.v1.routes import courses
from app.api.v1.routes import course_weights
from app.api.v1.routes import fuzzy_model_versions
from app.api.v1.routes import fuzzy_rules
from app.api.v1.routes import fuzzy_sets
from app.api.v1.routes import fuzzy_traces
from app.api.v1.routes import fuzzy_validation_cases
from app.api.v1.routes import fuzzy_variables
from app.api.v1.routes import grade_conversions
from app.api.v1.routes import health
from app.api.v1.routes import questions
from app.api.v1.routes import question_options
from app.api.v1.routes import recommendation_runs
from app.api.v1.routes import recommendation_scores
from app.api.v1.routes import specializations
from app.api.v1.routes import students
from app.api.v1.routes import transcript_imports

router=APIRouter(prefix="/api/v1",dependencies=[Depends(csrf)])
router.include_router(admin_sessions.router)
router.include_router(admin_users.router)
router.include_router(assessments.router)
router.include_router(assessment_answers.router)
router.include_router(assessment_grades.router)
router.include_router(assessment_items.router)
router.include_router(audit_logs.router)
router.include_router(courses.router)
router.include_router(course_weights.router)
router.include_router(fuzzy_model_versions.router)
router.include_router(fuzzy_rules.router)
router.include_router(fuzzy_sets.router)
router.include_router(fuzzy_traces.router)
router.include_router(fuzzy_validation_cases.router)
router.include_router(fuzzy_variables.router)
router.include_router(grade_conversions.router)
router.include_router(health.router)
router.include_router(questions.router)
router.include_router(question_options.router)
router.include_router(recommendation_runs.router)
router.include_router(recommendation_scores.router)
router.include_router(specializations.router)
router.include_router(students.router)
router.include_router(transcript_imports.router)
