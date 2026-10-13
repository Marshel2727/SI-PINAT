from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)

class Login(Input):
    email: str = Field(min_length=3,max_length=190)
    password: str = Field(min_length=1,max_length=512)

class Profile(Input):
    semester: int = Field(default=4,ge=1,le=14)
    nim: str | None = Field(default=None,max_length=20)
    full_name: str | None = Field(default=None,max_length=120)
    class_name: str | None = Field(default=None,max_length=40)
    preferred_specialization_code: str | None = None

class AssessmentCreate(Profile):
    mode: Literal["DEMO","FULL"]
    @model_validator(mode="after")
    def identity(self):
        if self.mode == "FULL" and (not self.nim or not self.full_name):
            raise ValueError("NIM dan nama wajib untuk asesmen FULL.")
        return self

class GradeRow(Input):
    semester: int = Field(ge=1,le=4)
    kode_mk: str = Field(min_length=1,max_length=20)
    nama_mk: str = Field(min_length=1,max_length=150)
    nilai_huruf: str = Field(min_length=1,max_length=3)

class GradePackage(Input):
    grades: list[GradeRow] = Field(max_length=1000)

class Answer(Input):
    option_id: int = Field(gt=0)

class Course(Input):
    code: str = Field(min_length=1,max_length=20)
    name: str = Field(min_length=1,max_length=150)
    semester: int = Field(ge=1,le=4)
    credits: int = Field(ge=1,le=12)
    is_active: bool = True

class Option(Input):
    label: str = Field(pattern=r"^[A-Z]$")
    option_text: str = Field(min_length=1,max_length=5000)
    is_correct: bool

class Question(Input):
    specialization_id: int = Field(gt=0)
    code: str = Field(min_length=1,max_length=32)
    prompt: str = Field(min_length=1,max_length=10000)
    explanation: str | None = Field(default=None,max_length=10000)
    options: list[Option] = Field(min_length=2,max_length=8)
    @model_validator(mode="after")
    def single(self):
        if len({o.label for o in self.options}) != len(self.options) or sum(o.is_correct for o in self.options) != 1:
            raise ValueError("Label harus unik dan tepat satu opsi benar.")
        return self

class ModelCreate(Input):
    version_code: str = Field(min_length=1,max_length=32,pattern=r"^[A-Za-z0-9_-]+$")
    sampling_step: float = Field(default=0.1,ge=0.01,le=1)

class Weight(Input):
    course_id: int = Field(gt=0)
    specialization_id: int = Field(gt=0)
    weight: float = Field(ge=0,le=1)
    is_required: bool = False

class Conversion(Input):
    letter_grade: str = Field(min_length=1,max_length=3)
    grade_points: float = Field(ge=0,le=4)
    normalized_score: float = Field(ge=0,le=100)

class Variable(Input):
    id: int | None = None
    code: Literal["ACADEMIC","COMPETENCY","SUITABILITY"]
    direction: Literal["INPUT","OUTPUT"]
    domain_min: float = Field(ge=0,lt=100)
    domain_max: float = Field(gt=0,le=100)
    @model_validator(mode="after")
    def domain(self):
        if self.domain_min >= self.domain_max or self.direction != ("OUTPUT" if self.code == "SUITABILITY" else "INPUT"):
            raise ValueError("Domain atau arah variabel salah.")
        return self

class FuzzySet(Input):
    id: int | None = None
    variable_id: int = Field(gt=0)
    code: Literal["LOW","MEDIUM","HIGH"]
    shape: Literal["TRIANGLE","TRAPEZOID"]
    point_a: float = Field(ge=0,le=100)
    point_b: float = Field(ge=0,le=100)
    point_c: float = Field(ge=0,le=100)
    point_d: float | None = Field(default=None,ge=0,le=100)
    @model_validator(mode="after")
    def shape_valid(self):
        if not self.point_a <= self.point_b <= self.point_c:
            raise ValueError("Parameter wajib a <= b <= c.")
        if self.shape == "TRIANGLE" and (self.point_d is not None or self.point_a == self.point_c):
            raise ValueError("Segitiga memerlukan d=null dan dukungan positif.")
        if self.shape == "TRAPEZOID" and (self.point_d is None or self.point_d < self.point_c or self.point_a == self.point_d):
            raise ValueError("Trapesium memerlukan c <= d dan dukungan positif.")
        return self

class Rule(Input):
    specialization_id: int = Field(gt=0)
    rule_code: str = Field(min_length=1,max_length=12)
    academic_set_id: int = Field(gt=0)
    competency_set_id: int = Field(gt=0)
    output_set_id: int = Field(gt=0)
    operator: Literal["AND","OR"] = "AND"
    rule_weight: float = Field(default=1,ge=0,le=1)

class ValidationCase(Input):
    specialization_id: int = Field(gt=0)
    case_code: str = Field(min_length=1,max_length=32)
    academic_input: float = Field(ge=0,le=100)
    competency_input: float = Field(ge=0,le=100)
    expected_min: float = Field(ge=0,le=100)
    expected_max: float = Field(ge=0,le=100)
    @model_validator(mode="after")
    def expected(self):
        if self.expected_min > self.expected_max or self.expected_max-self.expected_min >= 100:
            raise ValueError("Rentang ekspektasi tidak sah atau terlalu lebar.")
        return self

class Publish(Input):
    academic_review_confirmed: bool = False
