-- TDAC_clean local database bootstrap.
--
-- Creates the tables the application uses, matching the live database column
-- for column: same types, defaults, nullability, keys, checks and indexes, so
-- a clone built from this file alone behaves like one that grew over time.
--   ags42: PROJ, LOCA, GEOL, CORE, ISPT, SAMP
--   lab:   method_definition, test, test_revision, validation_issue,
--          review_event, ags_projection
--          (the results pipeline: a test is created once and then revised,
--          every revision kept so a released result can be traced back to
--          its readings and calculation package)
--   tdac:  roles, users                  (auth contract of app/auth/*)
--          PROJ_METADATA                  (project/report settings read and
--                                          written by portfolio_service.py,
--                                          including PROJECT_TYPE)
--          PROJECT_ID_COUNTER, SAMPLE_ID_COUNTER, SAMPLING_RECORD_ID
--                                         (number sequences, so two people
--                                          cannot allocate the same one)
--
-- The rest of the AGS 4.2 dictionary belongs to the schema builder and is
-- not created here.
--
-- Idempotent: safe to re-run. Defaults to the single real database
-- ags42_data (the same one the app and the AGS projects use):
--   psql -h 127.0.0.1 -U postgres -d ags42_data -f server/scripts/init_local_db.sql
-- Point dbname elsewhere to build a throwaway copy:
--   psql -h 127.0.0.1 -U postgres -d postgres -v dbname=scratch_db \
--        -f server/scripts/init_local_db.sql
-- Existing tables are left untouched (CREATE TABLE IF NOT EXISTS).

\if :{?dbname}
\else
\set dbname ags42_data
\endif
\connect :dbname

CREATE SCHEMA IF NOT EXISTS "ags42";
CREATE SCHEMA IF NOT EXISTS tdac;
CREATE SCHEMA IF NOT EXISTS lab;

-- Number sequences referenced by the table defaults above.
CREATE SEQUENCE IF NOT EXISTS tdac.roles_id_seq;
CREATE SEQUENCE IF NOT EXISTS tdac.users_id_seq;

-- ---------------------------------------------------------------------
-- ags42 data groups (only the columns this application reads/writes)
-- ---------------------------------------------------------------------



CREATE TABLE IF NOT EXISTS "ags42"."CORE" (
  "LOCA_ID" text,
  "CORE_TOP" numeric,
  "CORE_BASE" numeric,
  "CORE_PREC" numeric,
  "CORE_SREC" numeric,
  "CORE_RQD" numeric,
  "CORE_DIAM" numeric,
  "CORE_DURN" interval,
  "CORE_REM" text,
  "FILE_FSET" text,
  "PROJ_ID" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "ags42"."GEOL" (
  "LOCA_ID" text,
  "GEOL_TOP" numeric,
  "GEOL_BASE" numeric,
  "GEOL_DESC" text,
  "GEOL_LEG" text,
  "GEOL_GEOL" text,
  "GEOL_GEO2" text,
  "GEOL_STAT" text,
  "GEOL_BGS" text,
  "GEOL_FORM" text,
  "GEOL_REM" text,
  "FILE_FSET" text,
  "GEOL_BNDF" text,
  "PROJ_ID" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "ags42"."ISPT" (
  "LOCA_ID" text,
  "ISPT_TOP" numeric,
  "ISPT_SEAT" numeric,
  "ISPT_MAIN" numeric,
  "ISPT_NPEN" numeric,
  "ISPT_NVAL" numeric,
  "ISPT_REP" text,
  "ISPT_CAS" numeric,
  "ISPT_WAT" text,
  "ISPT_TYPE" text,
  "ISPT_HAM" text,
  "ISPT_ERAT" numeric,
  "ISPT_SWP" numeric,
  "ISPT_INC1" numeric,
  "ISPT_INC2" numeric,
  "ISPT_INC3" numeric,
  "ISPT_INC4" numeric,
  "ISPT_INC5" numeric,
  "ISPT_INC6" numeric,
  "ISPT_PEN1" numeric,
  "ISPT_PEN2" numeric,
  "ISPT_PEN3" numeric,
  "ISPT_PEN4" numeric,
  "ISPT_PEN5" numeric,
  "ISPT_PEN6" numeric,
  "ISPT_ROCK" boolean,
  "ISPT_REM" text,
  "ISPT_ENV" text,
  "ISPT_METH" text,
  "ISPT_CRED" text,
  "TEST_STAT" text,
  "FILE_FSET" text,
  "ISPT_N60" numeric,
  "PROJ_ID" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "ags42"."LOCA" (
  "LOCA_ID" text,
  "LOCA_TYPE" text,
  "LOCA_STAT" text,
  "LOCA_NATE" numeric,
  "LOCA_NATN" numeric,
  "LOCA_GREF" text,
  "LOCA_GL" numeric,
  "LOCA_REM" text,
  "LOCA_FDEP" numeric,
  "LOCA_STAR" timestamp with time zone,
  "LOCA_PURP" text,
  "LOCA_TERM" text,
  "LOCA_ENDD" timestamp with time zone,
  "LOCA_LETT" text,
  "LOCA_LOCX" numeric,
  "LOCA_LOCY" numeric,
  "LOCA_LOCZ" numeric,
  "LOCA_LREF" text,
  "LOCA_DATM" text,
  "LOCA_ETRV" numeric,
  "LOCA_NTRV" numeric,
  "LOCA_LTRV" numeric,
  "LOCA_XTRL" numeric,
  "LOCA_YTRL" numeric,
  "LOCA_ZTRL" numeric,
  "LOCA_LAT" text,
  "LOCA_LON" text,
  "LOCA_ELAT" text,
  "LOCA_ELON" text,
  "LOCA_LLZ" text,
  "LOCA_LOCM" text,
  "LOCA_LOCA" text,
  "LOCA_CLST" text,
  "LOCA_ALID" text,
  "LOCA_OFFS" numeric,
  "LOCA_CNGE" text,
  "LOCA_TRAN" text,
  "FILE_FSET" text,
  "LOCA_NATD" text,
  "LOCA_ORID" text,
  "LOCA_ORJO" text,
  "LOCA_ORCO" text,
  "LOCA_GLDT" timestamp with time zone,
  "LOCA_VSSL" text,
  "LOCA_NSRI" numeric,
  "LOCA_LSRI" numeric,
  "LOCA_LLSI" numeric,
  "PROJ_ID" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "ags42"."PROJ" (
  "PROJ_ID" text NOT NULL,
  "PROJ_NAME" text,
  "PROJ_LOC" text,
  "PROJ_CLNT" text,
  "PROJ_CONT" text,
  "PROJ_ENG" text,
  "PROJ_MEMO" text,
  "FILE_FSET" text
);
CREATE TABLE IF NOT EXISTS "ags42"."SAMP" (
  "LOCA_ID" text,
  "SAMP_TOP" numeric,
  "SAMP_REF" text,
  "SAMP_TYPE" text,
  "SAMP_ID" text,
  "SAMP_BASE" numeric,
  "SAMP_DTIM" timestamp with time zone,
  "SAMP_UBLO" numeric,
  "SAMP_CONT" text,
  "SAMP_PREP" text,
  "SAMP_SDIA" numeric,
  "SAMP_WDEP" numeric,
  "SAMP_RECV" numeric,
  "SAMP_TECH" text,
  "SAMP_MATX" text,
  "SAMP_TYPC" text,
  "SAMP_WHO" text,
  "SAMP_WHY" text,
  "SAMP_REM" text,
  "SAMP_DESC" text,
  "SAMP_DESD" timestamp with time zone,
  "SAMP_LOG" text,
  "SAMP_COND" text,
  "SAMP_CLSS" text,
  "SAMP_BAR" numeric,
  "SAMP_TEMP" numeric,
  "SAMP_PRES" numeric,
  "SAMP_FLOW" numeric,
  "SAMP_ETIM" timestamp with time zone,
  "SAMP_DURN" interval,
  "SAMP_CAPT" text,
  "SAMP_LINK" text,
  "GEOL_STAT" text,
  "FILE_FSET" text,
  "SAMP_RECL" numeric,
  "PROJ_ID" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "lab"."ags_projection" (
  "test_id" uuid NOT NULL,
  "revision_no" integer NOT NULL,
  "ags_group" text NOT NULL,
  "business_key" jsonb NOT NULL,
  "projected_row_count" integer NOT NULL,
  "projected_row_hash" text NOT NULL,
  "projection_status" text NOT NULL,
  "projected_at" timestamp with time zone,
  "projected_by" text,
  "error_detail" jsonb
);
CREATE TABLE IF NOT EXISTS "lab"."method_definition" (
  "method_definition_id" uuid NOT NULL,
  "method_code" text NOT NULL,
  "method_version" integer NOT NULL,
  "test_type" text NOT NULL,
  "method_name" text NOT NULL,
  "standard_body" text,
  "standard_reference" text,
  "standard_edition" text,
  "calculation_package" text NOT NULL,
  "calculation_package_version" text NOT NULL,
  "input_schema" jsonb NOT NULL,
  "validation_schema" jsonb NOT NULL,
  "result_schema" jsonb NOT NULL,
  "ags_mapping_profile" jsonb NOT NULL,
  "effective_from" date NOT NULL,
  "effective_to" date,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "lab"."review_event" (
  "review_event_id" uuid NOT NULL,
  "test_id" uuid NOT NULL,
  "revision_no" integer NOT NULL,
  "event_type" text NOT NULL,
  "from_status" text,
  "to_status" text NOT NULL,
  "actor" text NOT NULL,
  "actor_role" text NOT NULL,
  "reason" text,
  "event_at" timestamp with time zone NOT NULL DEFAULT now(),
  "correlation_id" text NOT NULL,
  "signature_metadata" jsonb
);
CREATE TABLE IF NOT EXISTS "lab"."test" (
  "test_id" uuid NOT NULL,
  "file_fset" text NOT NULL,
  "loca_id" text NOT NULL,
  "samp_id" text NOT NULL,
  "samp_top" numeric,
  "samp_ref" text,
  "samp_type" text,
  "spec_ref" text NOT NULL,
  "spec_depth" numeric,
  "spec_base" numeric,
  "spec_desc" text,
  "spec_prep" text,
  "test_type" text NOT NULL,
  "method_definition_id" uuid NOT NULL,
  "laboratory" text NOT NULL,
  "technician" text,
  "test_started_at" timestamp with time zone,
  "test_completed_at" timestamp with time zone,
  "source_type" text NOT NULL DEFAULT 'MANUAL'::text,
  "source_reference" text,
  "status" text NOT NULL DEFAULT 'DRAFT'::text,
  "current_revision" integer NOT NULL DEFAULT 1,
  "row_version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" text NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "lab"."test_revision" (
  "test_id" uuid NOT NULL,
  "revision_no" integer NOT NULL,
  "raw_input_snapshot" jsonb NOT NULL,
  "calculation_output_snapshot" jsonb,
  "validation_snapshot" jsonb,
  "calculation_package" text NOT NULL,
  "calculation_package_version" text NOT NULL,
  "method_definition_id" uuid NOT NULL,
  "revision_reason" text,
  "status" text NOT NULL,
  "immutable" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "lab"."validation_issue" (
  "validation_issue_id" uuid NOT NULL,
  "test_id" uuid NOT NULL,
  "revision_no" integer NOT NULL,
  "rule_code" text NOT NULL,
  "severity" text NOT NULL,
  "field_path" text,
  "message" text NOT NULL,
  "observed_value" jsonb,
  "expected_rule" jsonb,
  "resolved" boolean NOT NULL DEFAULT false,
  "resolution_reason" text,
  "resolved_by" text,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "tdac"."PROJECT_ID_COUNTER" (
  "YEAR" integer NOT NULL,
  "MONTH" integer NOT NULL,
  "LAST_NUMBER" integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "tdac"."PROJ_METADATA" (
  "PROJ_ID" text NOT NULL,
  "ROAD_REFERENCE" text,
  "CHAINAGE_TEXT" text,
  "STRUCTURE_REFERENCE" text,
  "SELECTED_BOREHOLES" text,
  "REPORT_TYPE" text,
  "REPORT_TITLE" text,
  "REPORT_VOLUME_TITLE" text,
  "DOCUMENT_REFERENCE" text,
  "REVISION" text,
  "REPORT_DATE" date,
  "ISSUE_STATUS" text,
  "TDAC_COMPANY_NAME" text,
  "GROUNDWATER_BASIS" text,
  "DESIGN_STANDARD_BASIS" text,
  "FACTOR_OF_SAFETY_BASIS" text,
  "LOAD_COMBINATION_BASIS" text,
  "CONSTRUCTION_VERIFICATION_REQUIREMENT" text,
  "PILE_LOAD_TEST_REQUIREMENT" text,
  "PROJECT_TYPE" text
);
CREATE TABLE IF NOT EXISTS "tdac"."SAMPLE_ID_COUNTER" (
  "PROJ_ID" text NOT NULL,
  "LAST_NUMBER" integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "tdac"."SAMPLING_RECORD_ID" (
  "SAMPLE_ID" text NOT NULL,
  "PROJ_ID" text NOT NULL,
  "LOCA_ID" text NOT NULL,
  "DEPTH_FROM" numeric NOT NULL
);
CREATE TABLE IF NOT EXISTS "tdac"."roles" (
  "id" bigint NOT NULL DEFAULT nextval('tdac.roles_id_seq'::regclass),
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT ''::text,
  "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_builtin" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "tdac"."users" (
  "id" bigint NOT NULL DEFAULT nextval('tdac.users_id_seq'::regclass),
  "username" text NOT NULL,
  "hashed_password" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "token_gen" integer NOT NULL DEFAULT 0,
  "role_id" bigint NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_core_ident ON ags42."CORE" USING btree ("LOCA_ID", "CORE_TOP", "CORE_BASE", "PROJ_ID");
CREATE UNIQUE INDEX IF NOT EXISTS uq_core_identity_partial_blanks ON ags42."CORE" USING btree ("PROJ_ID", "LOCA_ID", "CORE_TOP", "CORE_BASE") NULLS NOT DISTINCT WHERE (("LOCA_ID" IS NOT NULL) OR ("CORE_TOP" IS NOT NULL) OR ("CORE_BASE" IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS uq_geol_ident ON ags42."GEOL" USING btree ("LOCA_ID", "GEOL_TOP", "GEOL_BASE", "PROJ_ID");
CREATE UNIQUE INDEX IF NOT EXISTS uq_geol_identity_partial_blanks ON ags42."GEOL" USING btree ("PROJ_ID", "LOCA_ID", "GEOL_TOP", "GEOL_BASE") NULLS NOT DISTINCT WHERE (("LOCA_ID" IS NOT NULL) OR ("GEOL_TOP" IS NOT NULL) OR ("GEOL_BASE" IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS uq_ispt_ident ON ags42."ISPT" USING btree ("LOCA_ID", "ISPT_TOP", "PROJ_ID");
CREATE UNIQUE INDEX IF NOT EXISTS uq_ispt_identity_partial_blanks ON ags42."ISPT" USING btree ("PROJ_ID", "LOCA_ID", "ISPT_TOP") NULLS NOT DISTINCT WHERE (("LOCA_ID" IS NOT NULL) OR ("ISPT_TOP" IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS uq_loca_ident ON ags42."LOCA" USING btree ("LOCA_ID", "PROJ_ID");
CREATE UNIQUE INDEX IF NOT EXISTS uq_loca_identity_partial_blanks ON ags42."LOCA" USING btree ("PROJ_ID", "LOCA_ID") NULLS NOT DISTINCT WHERE ("LOCA_ID" IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_samp_identity_partial_blanks ON ags42."SAMP" USING btree ("PROJ_ID", "LOCA_ID", "SAMP_TOP", "SAMP_REF", "SAMP_TYPE", "SAMP_ID") NULLS NOT DISTINCT WHERE (("LOCA_ID" IS NOT NULL) OR ("SAMP_TOP" IS NOT NULL) OR ("SAMP_REF" IS NOT NULL) OR ("SAMP_TYPE" IS NOT NULL) OR ("SAMP_ID" IS NOT NULL));
CREATE INDEX IF NOT EXISTS ix_lab_review_event_test ON lab.review_event USING btree (test_id, revision_no, event_at);
CREATE INDEX IF NOT EXISTS ix_lab_test_depth ON lab.test USING btree (file_fset, loca_id, spec_depth);
CREATE INDEX IF NOT EXISTS ix_lab_test_project_status ON lab.test USING btree (file_fset, status, test_type);
CREATE INDEX IF NOT EXISTS ix_lab_test_sample ON lab.test USING btree (file_fset, loca_id, samp_id, spec_ref);
CREATE INDEX IF NOT EXISTS ix_lab_validation_open ON lab.validation_issue USING btree (test_id, revision_no, severity) WHERE (resolved = false);

ALTER TABLE "ags42"."CORE" ADD CONSTRAINT "ck_core_core_d943ece464" CHECK ((btrim("PROJ_ID") <> ''::text));
ALTER TABLE "ags42"."CORE" ADD CONSTRAINT "uq_core_identity" UNIQUE ("PROJ_ID", "LOCA_ID", "CORE_TOP", "CORE_BASE");
ALTER TABLE "ags42"."GEOL" ADD CONSTRAINT "ck_geol_geol_3bef604b0c" CHECK ((btrim("PROJ_ID") <> ''::text));
ALTER TABLE "ags42"."GEOL" ADD CONSTRAINT "uq_geol_identity" UNIQUE ("PROJ_ID", "LOCA_ID", "GEOL_TOP", "GEOL_BASE");
ALTER TABLE "ags42"."ISPT" ADD CONSTRAINT "ck_ispt_ispt_cc662df44b" CHECK ((btrim("PROJ_ID") <> ''::text));
ALTER TABLE "ags42"."ISPT" ADD CONSTRAINT "uq_ispt_identity" UNIQUE ("PROJ_ID", "LOCA_ID", "ISPT_TOP");
ALTER TABLE "ags42"."LOCA" ADD CONSTRAINT "ck_loca_loca_a1068b4eaf" CHECK ((btrim("PROJ_ID") <> ''::text));
ALTER TABLE "ags42"."LOCA" ADD CONSTRAINT "uq_loca_identity" UNIQUE ("PROJ_ID", "LOCA_ID");
ALTER TABLE "ags42"."PROJ" ADD CONSTRAINT "ck_proj_proj_2327ccca89" CHECK ((btrim("PROJ_ID") <> ''::text));
ALTER TABLE "ags42"."PROJ" ADD CONSTRAINT "pk_proj_proj_0fb63dd3e2" PRIMARY KEY ("PROJ_ID");
ALTER TABLE "ags42"."SAMP" ADD CONSTRAINT "ck_samp_samp_f242f813f0" CHECK ((btrim("PROJ_ID") <> ''::text));
ALTER TABLE "ags42"."SAMP" ADD CONSTRAINT "uq_samp_identity" UNIQUE ("PROJ_ID", "LOCA_ID", "SAMP_TOP", "SAMP_REF", "SAMP_TYPE", "SAMP_ID");
ALTER TABLE "lab"."ags_projection" ADD CONSTRAINT "ags_projection_ags_group_check" CHECK ((ags_group = ANY (ARRAY['GRAG'::text, 'GRAT'::text, 'LPDN'::text, 'LLPL'::text, 'LSLT'::text, 'TRIG'::text, 'TRIT'::text, 'CONG'::text, 'CONS'::text])));
ALTER TABLE "lab"."ags_projection" ADD CONSTRAINT "ags_projection_pkey" PRIMARY KEY (test_id, revision_no, ags_group);
ALTER TABLE "lab"."ags_projection" ADD CONSTRAINT "ags_projection_projected_row_count_check" CHECK ((projected_row_count >= 0));
ALTER TABLE "lab"."ags_projection" ADD CONSTRAINT "ags_projection_projection_status_check" CHECK ((projection_status = ANY (ARRAY['PENDING'::text, 'PROJECTED'::text, 'FAILED'::text, 'SUPERSEDED'::text])));
ALTER TABLE "lab"."method_definition" ADD CONSTRAINT "method_definition_method_code_method_version_key" UNIQUE (method_code, method_version);
ALTER TABLE "lab"."method_definition" ADD CONSTRAINT "method_definition_pkey" PRIMARY KEY (method_definition_id);
ALTER TABLE "lab"."method_definition" ADD CONSTRAINT "method_definition_test_type_check" CHECK ((test_type = ANY (ARRAY['PSD'::text, 'PARTICLE_DENSITY'::text, 'ATTERBERG'::text, 'SHRINKAGE_LIMIT'::text, 'TRIAXIAL_UU'::text, 'CONSOLIDATION'::text])));
ALTER TABLE "lab"."review_event" ADD CONSTRAINT "review_event_event_type_check" CHECK ((event_type = ANY (ARRAY['CREATED'::text, 'CALCULATED'::text, 'SUBMITTED'::text, 'RETURNED'::text, 'CHECKED'::text, 'APPROVED'::text, 'PUBLISHED'::text, 'SUPERSEDED'::text, 'VOIDED'::text])));
ALTER TABLE "lab"."review_event" ADD CONSTRAINT "review_event_pkey" PRIMARY KEY (review_event_id);
ALTER TABLE "lab"."test" ADD CONSTRAINT "test_check" CHECK (((spec_base IS NULL) OR (spec_depth IS NULL) OR (spec_base >= spec_depth)));
ALTER TABLE "lab"."test" ADD CONSTRAINT "test_check1" CHECK (((test_completed_at IS NULL) OR (test_started_at IS NULL) OR (test_completed_at >= test_started_at)));
ALTER TABLE "lab"."test" ADD CONSTRAINT "test_current_revision_check" CHECK ((current_revision >= 1));
ALTER TABLE "lab"."test" ADD CONSTRAINT "test_file_fset_loca_id_samp_id_spec_ref_test_type_current_r_key" UNIQUE (file_fset, loca_id, samp_id, spec_ref, test_type, current_revision);
ALTER TABLE "lab"."test" ADD CONSTRAINT "test_pkey" PRIMARY KEY (test_id);
ALTER TABLE "lab"."test" ADD CONSTRAINT "test_row_version_check" CHECK ((row_version >= 1));
ALTER TABLE "lab"."test" ADD CONSTRAINT "test_source_type_check" CHECK ((source_type = ANY (ARRAY['MANUAL'::text, 'INSTRUMENT'::text, 'AGS'::text, 'XLSX_CSV'::text, 'API'::text, 'MIGRATION'::text])));
ALTER TABLE "lab"."test" ADD CONSTRAINT "test_status_check" CHECK ((status = ANY (ARRAY['DRAFT'::text, 'CALCULATED'::text, 'SUBMITTED'::text, 'RETURNED'::text, 'CHECKED'::text, 'APPROVED'::text, 'PUBLISHED'::text, 'SUPERSEDED'::text, 'VOID'::text])));
ALTER TABLE "lab"."test" ADD CONSTRAINT "test_test_type_check" CHECK ((test_type = ANY (ARRAY['PSD'::text, 'PARTICLE_DENSITY'::text, 'ATTERBERG'::text, 'SHRINKAGE_LIMIT'::text, 'TRIAXIAL_UU'::text, 'CONSOLIDATION'::text])));
ALTER TABLE "lab"."test_revision" ADD CONSTRAINT "test_revision_pkey" PRIMARY KEY (test_id, revision_no);
ALTER TABLE "lab"."test_revision" ADD CONSTRAINT "test_revision_revision_no_check" CHECK ((revision_no >= 1));
ALTER TABLE "lab"."validation_issue" ADD CONSTRAINT "validation_issue_pkey" PRIMARY KEY (validation_issue_id);
ALTER TABLE "lab"."validation_issue" ADD CONSTRAINT "validation_issue_severity_check" CHECK ((severity = ANY (ARRAY['INFO'::text, 'WARNING'::text, 'ERROR'::text, 'BLOCKER'::text])));
ALTER TABLE "tdac"."PROJECT_ID_COUNTER" ADD CONSTRAINT "PK_PROJECT_ID_COUNTER" PRIMARY KEY ("YEAR", "MONTH");
ALTER TABLE "tdac"."PROJ_METADATA" ADD CONSTRAINT "CHK_PROJ_METADATA_ISSUE_STATUS" CHECK ((("ISSUE_STATUS" IS NULL) OR ("ISSUE_STATUS" = ANY (ARRAY['Draft'::text, 'For Review'::text, 'Client Issue'::text, 'Final'::text, 'Superseded'::text]))));
ALTER TABLE "tdac"."PROJ_METADATA" ADD CONSTRAINT "CHK_PROJ_METADATA_REPORT_TYPE" CHECK ((("REPORT_TYPE" IS NULL) OR ("REPORT_TYPE" = ANY (ARRAY['Factual'::text, 'Interpretive'::text, 'Design'::text, 'Final'::text]))));
ALTER TABLE "tdac"."PROJ_METADATA" ADD CONSTRAINT "PROJ_METADATA_pkey" PRIMARY KEY ("PROJ_ID");
ALTER TABLE "tdac"."SAMPLE_ID_COUNTER" ADD CONSTRAINT "SAMPLE_ID_COUNTER_pkey" PRIMARY KEY ("PROJ_ID");
ALTER TABLE "tdac"."SAMPLING_RECORD_ID" ADD CONSTRAINT "SAMPLING_RECORD_ID_pkey" PRIMARY KEY ("SAMPLE_ID");
ALTER TABLE "tdac"."SAMPLING_RECORD_ID" ADD CONSTRAINT "UQ_SAMPLING_RECORD_PROJECT_DEPTH" UNIQUE ("PROJ_ID", "LOCA_ID", "DEPTH_FROM");
ALTER TABLE "tdac"."roles" ADD CONSTRAINT "roles_name_key" UNIQUE (name);
ALTER TABLE "tdac"."roles" ADD CONSTRAINT "roles_pkey" PRIMARY KEY (id);
ALTER TABLE "tdac"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE "tdac"."users" ADD CONSTRAINT "users_username_key" UNIQUE (username);
ALTER TABLE "ags42"."CORE" ADD CONSTRAINT "fk_core_loca_2be9a67e60" FOREIGN KEY ("PROJ_ID", "LOCA_ID") REFERENCES ags42."LOCA"("PROJ_ID", "LOCA_ID");
ALTER TABLE "ags42"."GEOL" ADD CONSTRAINT "fk_geol_loca_0e640fdaea" FOREIGN KEY ("PROJ_ID", "LOCA_ID") REFERENCES ags42."LOCA"("PROJ_ID", "LOCA_ID");
ALTER TABLE "ags42"."ISPT" ADD CONSTRAINT "fk_ispt_loca_6512b3d86b" FOREIGN KEY ("PROJ_ID", "LOCA_ID") REFERENCES ags42."LOCA"("PROJ_ID", "LOCA_ID");
ALTER TABLE "ags42"."LOCA" ADD CONSTRAINT "fk_loca_proj_d934b5c9d1" FOREIGN KEY ("PROJ_ID") REFERENCES ags42."PROJ"("PROJ_ID");
ALTER TABLE "ags42"."SAMP" ADD CONSTRAINT "fk_samp_loca_353c82c35f" FOREIGN KEY ("PROJ_ID", "LOCA_ID") REFERENCES ags42."LOCA"("PROJ_ID", "LOCA_ID");
ALTER TABLE "lab"."ags_projection" ADD CONSTRAINT "ags_projection_test_id_fkey" FOREIGN KEY (test_id) REFERENCES lab.test(test_id);
ALTER TABLE "lab"."ags_projection" ADD CONSTRAINT "ags_projection_test_id_revision_no_fkey" FOREIGN KEY (test_id, revision_no) REFERENCES lab.test_revision(test_id, revision_no);
ALTER TABLE "lab"."review_event" ADD CONSTRAINT "review_event_test_id_fkey" FOREIGN KEY (test_id) REFERENCES lab.test(test_id);
ALTER TABLE "lab"."review_event" ADD CONSTRAINT "review_event_test_id_revision_no_fkey" FOREIGN KEY (test_id, revision_no) REFERENCES lab.test_revision(test_id, revision_no);
ALTER TABLE "lab"."test" ADD CONSTRAINT "test_method_definition_id_fkey" FOREIGN KEY (method_definition_id) REFERENCES lab.method_definition(method_definition_id);
ALTER TABLE "lab"."test_revision" ADD CONSTRAINT "test_revision_method_definition_id_fkey" FOREIGN KEY (method_definition_id) REFERENCES lab.method_definition(method_definition_id);
ALTER TABLE "lab"."test_revision" ADD CONSTRAINT "test_revision_test_id_fkey" FOREIGN KEY (test_id) REFERENCES lab.test(test_id);
ALTER TABLE "lab"."validation_issue" ADD CONSTRAINT "validation_issue_test_id_fkey" FOREIGN KEY (test_id) REFERENCES lab.test(test_id);
ALTER TABLE "lab"."validation_issue" ADD CONSTRAINT "validation_issue_test_id_revision_no_fkey" FOREIGN KEY (test_id, revision_no) REFERENCES lab.test_revision(test_id, revision_no);
ALTER TABLE "tdac"."PROJ_METADATA" ADD CONSTRAINT "FK_PROJ_METADATA_PROJ" FOREIGN KEY ("PROJ_ID") REFERENCES ags42."PROJ"("PROJ_ID") ON DELETE CASCADE;
ALTER TABLE "tdac"."SAMPLE_ID_COUNTER" ADD CONSTRAINT "FK_SAMPLE_ID_COUNTER_PROJ" FOREIGN KEY ("PROJ_ID") REFERENCES ags42."PROJ"("PROJ_ID") ON DELETE CASCADE;
ALTER TABLE "tdac"."SAMPLING_RECORD_ID" ADD CONSTRAINT "FK_SAMPLING_RECORD_ID_PROJ" FOREIGN KEY ("PROJ_ID") REFERENCES ags42."PROJ"("PROJ_ID") ON DELETE CASCADE;
ALTER TABLE "tdac"."users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY (role_id) REFERENCES tdac.roles(id);
