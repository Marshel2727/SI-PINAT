from app.models.metadata import metadata
from app.models.admin_users import admin_users
from app.models.admin_sessions import admin_sessions
from app.models.audit_logs import audit_logs
from app.models.students import students
from app.models.specializations import specializations
from app.models.courses import courses
from app.models.questions import questions
from app.models.question_options import question_options
from app.models.fuzzy_model_versions import fuzzy_model_versions
from app.models.grade_conversions import grade_conversions
from app.models.course_weights import course_weights
from app.models.assessments import assessments
from app.models.transcript_imports import transcript_imports
from app.models.assessment_grades import assessment_grades
from app.models.assessment_items import assessment_items
from app.models.assessment_answers import assessment_answers
from app.models.fuzzy_variables import fuzzy_variables
from app.models.fuzzy_sets import fuzzy_sets
from app.models.fuzzy_rules import fuzzy_rules
from app.models.fuzzy_validation_cases import fuzzy_validation_cases
from app.models.recommendation_runs import recommendation_runs
from app.models.recommendation_scores import recommendation_scores
from app.models.fuzzy_traces import fuzzy_traces

TABLES = {t.name: t for t in metadata.sorted_tables}
