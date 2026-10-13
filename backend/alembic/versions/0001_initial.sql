CREATE TABLE `admin_users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_admin_users_1` UNIQUE (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `admin_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_admin_sessions_1` UNIQUE (`token_hash`),
  CONSTRAINT `fk_admin_sessions_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(80) NOT NULL,
  `entity_table` VARCHAR(80) NOT NULL,
  `entity_id` BIGINT UNSIGNED NULL,
  `before_data` JSON NULL,
  `after_data` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_audit_logs_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `students` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nim` VARCHAR(20) NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `class_name` VARCHAR(40) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_students_1` UNIQUE (`nim`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `specializations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_specializations_1` UNIQUE (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `courses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `semester` TINYINT UNSIGNED NOT NULL,
  `credits` TINYINT UNSIGNED NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_courses_1` UNIQUE (`code`),
  CONSTRAINT `ck_courses_1` CHECK (semester BETWEEN 1 AND 4),
  CONSTRAINT `ck_courses_2` CHECK (credits BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `questions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `specialization_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `revision` INT UNSIGNED NOT NULL,
  `prompt` TEXT NOT NULL,
  `explanation` TEXT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_questions_1` UNIQUE (`code`, `revision`),
  CONSTRAINT `fk_questions_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_questions_1` CHECK (revision > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `question_options` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `label` CHAR(1) NOT NULL,
  `option_text` TEXT NOT NULL,
  `is_correct` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_question_options_1` UNIQUE (`question_id`, `label`),
  CONSTRAINT `uq_question_options_2` UNIQUE (`question_id`, `id`),
  CONSTRAINT `fk_question_options_question_id` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_model_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `version_code` VARCHAR(32) NOT NULL,
  `method` ENUM('MAMDANI') NOT NULL,
  `defuzzification` ENUM('CENTROID') NOT NULL,
  `sampling_step` DECIMAL(8,5) NOT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `published_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_fuzzy_model_versions_1` UNIQUE (`version_code`),
  CONSTRAINT `fk_fuzzy_model_versions_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_model_versions_1` CHECK (sampling_step BETWEEN 0.01 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `grade_conversions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `letter_grade` VARCHAR(3) NOT NULL,
  `grade_points` DECIMAL(3,2) NOT NULL,
  `normalized_score` DECIMAL(7,4) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_grade_conversions_1` UNIQUE (`model_version_id`, `letter_grade`),
  CONSTRAINT `fk_grade_conversions_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_grade_conversions_1` CHECK (grade_points BETWEEN 0 AND 4),
  CONSTRAINT `ck_grade_conversions_2` CHECK (normalized_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `course_weights` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `course_id` BIGINT UNSIGNED NOT NULL,
  `specialization_id` BIGINT UNSIGNED NOT NULL,
  `weight` DECIMAL(6,5) NOT NULL,
  `is_required` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_course_weights_1` UNIQUE (`model_version_id`, `course_id`, `specialization_id`),
  CONSTRAINT `fk_course_weights_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_course_weights_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_course_weights_course_id` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_course_weights_1` CHECK (weight BETWEEN 0 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `assessments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `student_id` BIGINT UNSIGNED NULL,
  `preferred_specialization_id` BIGINT UNSIGNED NULL,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `access_token_hash` CHAR(64) NOT NULL,
  `mode` ENUM('DEMO', 'FULL') NOT NULL,
  `status` ENUM('DRAFT', 'ACADEMIC_READY', 'IN_PROGRESS', 'COMPLETED') NOT NULL,
  `current_semester` TINYINT UNSIGNED NOT NULL,
  `question_count` SMALLINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  `expires_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_assessments_1` UNIQUE (`public_id`),
  CONSTRAINT `uq_assessments_2` UNIQUE (`access_token_hash`),
  CONSTRAINT `uq_assessments_3` UNIQUE (`id`, `model_version_id`),
  CONSTRAINT `fk_assessments_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessments_preferred_specialization_id` FOREIGN KEY (`preferred_specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessments_student_id` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_assessments_1` CHECK (current_semester BETWEEN 1 AND 14),
  CONSTRAINT `ck_assessments_2` CHECK (question_count > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `transcript_imports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assessment_id` BIGINT UNSIGNED NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `storage_key` VARCHAR(255) NULL,
  `file_hash` CHAR(64) NOT NULL,
  `status` ENUM('PENDING', 'VALID', 'INVALID') NOT NULL,
  `validation_errors` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_transcript_imports_assessment_id` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `assessment_grades` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assessment_id` BIGINT UNSIGNED NOT NULL,
  `course_id` BIGINT UNSIGNED NOT NULL,
  `grade_conversion_id` BIGINT UNSIGNED NOT NULL,
  `letter_grade` VARCHAR(3) NOT NULL,
  `normalized_score` DECIMAL(7,4) NOT NULL,
  `credits_snapshot` TINYINT UNSIGNED NOT NULL,
  `course_snapshot` JSON NOT NULL,
  `source` ENUM('IMPORT', 'MANUAL') NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_assessment_grades_1` UNIQUE (`assessment_id`, `course_id`),
  CONSTRAINT `fk_assessment_grades_grade_conversion_id` FOREIGN KEY (`grade_conversion_id`) REFERENCES `grade_conversions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessment_grades_course_id` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessment_grades_assessment_id` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_assessment_grades_1` CHECK (normalized_score BETWEEN 0 AND 100),
  CONSTRAINT `ck_assessment_grades_2` CHECK (credits_snapshot BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `assessment_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assessment_id` BIGINT UNSIGNED NOT NULL,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `order_no` SMALLINT UNSIGNED NOT NULL,
  `max_points` DECIMAL(7,4) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_assessment_items_1` UNIQUE (`assessment_id`, `question_id`),
  CONSTRAINT `uq_assessment_items_2` UNIQUE (`assessment_id`, `order_no`),
  CONSTRAINT `uq_assessment_items_3` UNIQUE (`id`, `question_id`),
  CONSTRAINT `fk_assessment_items_question_id` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessment_items_assessment_id` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_assessment_items_1` CHECK (order_no > 0),
  CONSTRAINT `ck_assessment_items_2` CHECK (max_points > 0 AND max_points <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `assessment_answers` (
  `assessment_item_id` BIGINT UNSIGNED NOT NULL,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `option_id` BIGINT UNSIGNED NOT NULL,
  `answer_source` ENUM('USER', 'EXAMPLE') NOT NULL,
  `awarded_points` DECIMAL(7,4) NOT NULL,
  `answered_at` DATETIME NOT NULL,
  PRIMARY KEY (`assessment_item_id`),
  CONSTRAINT `fk_assessment_answers_option_id` FOREIGN KEY (`question_id`, `option_id`) REFERENCES `question_options` (`question_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessment_answers_assessment_item_id` FOREIGN KEY (`assessment_item_id`, `question_id`) REFERENCES `assessment_items` (`id`, `question_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_assessment_answers_1` CHECK (awarded_points BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_variables` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `code` ENUM('ACADEMIC', 'COMPETENCY', 'SUITABILITY') NOT NULL,
  `direction` ENUM('INPUT', 'OUTPUT') NOT NULL,
  `domain_min` DECIMAL(7,4) NOT NULL,
  `domain_max` DECIMAL(7,4) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_fuzzy_variables_1` UNIQUE (`model_version_id`, `code`),
  CONSTRAINT `fk_fuzzy_variables_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_variables_1` CHECK (domain_min >= 0 AND domain_max <= 100 AND domain_min < domain_max)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_sets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `variable_id` BIGINT UNSIGNED NOT NULL,
  `code` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
  `shape` ENUM('TRIANGLE', 'TRAPEZOID') NOT NULL,
  `point_a` DECIMAL(7,4) NOT NULL,
  `point_b` DECIMAL(7,4) NOT NULL,
  `point_c` DECIMAL(7,4) NOT NULL,
  `point_d` DECIMAL(7,4) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_fuzzy_sets_1` UNIQUE (`variable_id`, `code`),
  CONSTRAINT `fk_fuzzy_sets_variable_id` FOREIGN KEY (`variable_id`) REFERENCES `fuzzy_variables` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_sets_1` CHECK (point_a <= point_b AND point_b <= point_c),
  CONSTRAINT `ck_fuzzy_sets_2` CHECK ((shape = 'TRIANGLE' AND point_d IS NULL) OR (shape = 'TRAPEZOID' AND point_d IS NOT NULL AND point_c <= point_d))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `specialization_id` BIGINT UNSIGNED NOT NULL,
  `rule_code` VARCHAR(12) NOT NULL,
  `academic_set_id` BIGINT UNSIGNED NOT NULL,
  `competency_set_id` BIGINT UNSIGNED NOT NULL,
  `output_set_id` BIGINT UNSIGNED NOT NULL,
  `operator` ENUM('AND', 'OR') NOT NULL,
  `rule_weight` DECIMAL(6,5) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_fuzzy_rules_1` UNIQUE (`model_version_id`, `specialization_id`, `rule_code`),
  CONSTRAINT `fk_fuzzy_rules_output_set_id` FOREIGN KEY (`output_set_id`) REFERENCES `fuzzy_sets` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_fuzzy_rules_competency_set_id` FOREIGN KEY (`competency_set_id`) REFERENCES `fuzzy_sets` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_fuzzy_rules_academic_set_id` FOREIGN KEY (`academic_set_id`) REFERENCES `fuzzy_sets` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_fuzzy_rules_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_fuzzy_rules_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_rules_1` CHECK (rule_weight BETWEEN 0 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_validation_cases` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `specialization_id` BIGINT UNSIGNED NOT NULL,
  `case_code` VARCHAR(32) NOT NULL,
  `academic_input` DECIMAL(7,4) NOT NULL,
  `competency_input` DECIMAL(7,4) NOT NULL,
  `expected_min` DECIMAL(8,5) NOT NULL,
  `expected_max` DECIMAL(8,5) NOT NULL,
  `last_actual_score` DECIMAL(8,5) NULL,
  `last_passed` BOOLEAN NULL,
  `last_tested_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_fuzzy_validation_cases_1` UNIQUE (`model_version_id`, `specialization_id`, `case_code`),
  CONSTRAINT `fk_fuzzy_validation_cases_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_fuzzy_validation_cases_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_validation_cases_1` CHECK (academic_input BETWEEN 0 AND 100),
  CONSTRAINT `ck_fuzzy_validation_cases_2` CHECK (competency_input BETWEEN 0 AND 100),
  CONSTRAINT `ck_fuzzy_validation_cases_3` CHECK (expected_min >= 0 AND expected_max <= 100 AND expected_min <= expected_max),
  CONSTRAINT `ck_fuzzy_validation_cases_4` CHECK (last_actual_score IS NULL OR last_actual_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `recommendation_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assessment_id` BIGINT UNSIGNED NOT NULL,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `engine_version` VARCHAR(40) NOT NULL,
  `status` ENUM('SUCCESS', 'FAILED') NOT NULL,
  `error_message` TEXT NULL,
  `calculated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_recommendation_runs_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_recommendation_runs_assessment_id` FOREIGN KEY (`assessment_id`, `model_version_id`) REFERENCES `assessments` (`id`, `model_version_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `recommendation_scores` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `run_id` BIGINT UNSIGNED NOT NULL,
  `specialization_id` BIGINT UNSIGNED NOT NULL,
  `academic_score` DECIMAL(7,4) NOT NULL,
  `competency_score` DECIMAL(7,4) NOT NULL,
  `suitability_score` DECIMAL(8,5) NOT NULL,
  `rank_position` SMALLINT UNSIGNED NOT NULL,
  `reason` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_recommendation_scores_1` UNIQUE (`run_id`, `specialization_id`),
  CONSTRAINT `fk_recommendation_scores_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_recommendation_scores_run_id` FOREIGN KEY (`run_id`) REFERENCES `recommendation_runs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_recommendation_scores_1` CHECK (academic_score BETWEEN 0 AND 100),
  CONSTRAINT `ck_recommendation_scores_2` CHECK (competency_score BETWEEN 0 AND 100),
  CONSTRAINT `ck_recommendation_scores_3` CHECK (suitability_score BETWEEN 0 AND 100),
  CONSTRAINT `ck_recommendation_scores_4` CHECK (rank_position > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_traces` (
  `score_id` BIGINT UNSIGNED NOT NULL,
  `memberships` JSON NOT NULL,
  `rule_activations` JSON NOT NULL,
  `aggregated_curve` JSON NOT NULL,
  `centroid_numerator` DECIMAL(20,10) NOT NULL,
  `centroid_denominator` DECIMAL(20,10) NOT NULL,
  `sampling_step` DECIMAL(8,5) NOT NULL,
  PRIMARY KEY (`score_id`),
  CONSTRAINT `fk_fuzzy_traces_score_id` FOREIGN KEY (`score_id`) REFERENCES `recommendation_scores` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_traces_1` CHECK (centroid_denominator > 0),
  CONSTRAINT `ck_fuzzy_traces_2` CHECK (sampling_step BETWEEN 0.01 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO specializations (code, name, description, is_active) VALUES ('ES-01', 'Embedded System', NULL, TRUE), ('SC-02', 'Sistem Cerdas', NULL, TRUE), ('JDF-03', 'Jaringan & Digital Forensik', NULL, TRUE);