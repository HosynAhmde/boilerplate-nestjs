import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitIam1793466114304 implements MigrationInterface {
  name = 'InitIam1793466114304';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auth_session" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "user_id" bigint NOT NULL, "refresh_token_hash" text NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "user_agent" text, "ip" inet, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_auth_session_refresh_token_hash" UNIQUE ("refresh_token_hash"), CONSTRAINT "pk_auth_session" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_session_user_id_active" ON "auth_session"  ("user_id") WHERE "revoked_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "otp_challenge" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "mobile" text NOT NULL, "code_hash" text NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempt_count" integer NOT NULL DEFAULT '0', "consumed_at" TIMESTAMP WITH TIME ZONE, "requested_ip" inet, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "chk_otp_challenge_attempt_count" CHECK ("attempt_count" BETWEEN 0 AND 5), CONSTRAINT "pk_otp_challenge" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_otp_challenge_mobile_created_at" ON "otp_challenge"  ("mobile", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "app_section" ("code" text NOT NULL, "title_fa" text NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "pk_app_section" PRIMARY KEY ("code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "app_user" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "full_name" text NOT NULL, "mobile" text NOT NULL, "role_id" bigint NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "failed_otp_count" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP WITH TIME ZONE, "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" bigint, CONSTRAINT "uq_app_user_mobile" UNIQUE ("mobile"), CONSTRAINT "chk_app_user_failed_otp_count" CHECK ("failed_otp_count" >= 0), CONSTRAINT "chk_app_user_mobile" CHECK ("mobile" ~ '^09[0-9]{9}$'), CONSTRAINT "pk_app_user" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "idx_app_user_role_id" ON "app_user"  ("role_id") `);
    await queryRunner.query(
      `CREATE TABLE "role_section_permission" ("role_id" bigint NOT NULL, "section_code" text NOT NULL, "can_view" boolean NOT NULL DEFAULT false, "can_create" boolean NOT NULL DEFAULT false, "can_edit" boolean NOT NULL DEFAULT false, "can_delete" boolean NOT NULL DEFAULT false, "can_approve" boolean NOT NULL DEFAULT false, CONSTRAINT "chk_role_section_permission_view" CHECK ("can_view" OR NOT ("can_create" OR "can_edit" OR "can_delete" OR "can_approve")), CONSTRAINT "pk_role_section_permission" PRIMARY KEY ("role_id", "section_code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_special_permission" ("role_id" bigint NOT NULL, "permission_code" text NOT NULL, CONSTRAINT "pk_role_special_permission" PRIMARY KEY ("role_id", "permission_code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "name" text NOT NULL, "description" text, "is_system" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_role_name" UNIQUE ("name"), CONSTRAINT "pk_role" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "special_permission" ("code" text NOT NULL, "title_fa" text NOT NULL, CONSTRAINT "pk_special_permission" PRIMARY KEY ("code"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_session" ADD CONSTRAINT "fk_auth_session_user" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app_user" ADD CONSTRAINT "fk_app_user_role" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "app_user" ADD CONSTRAINT "fk_app_user_created_by" FOREIGN KEY ("created_by") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_section_permission" ADD CONSTRAINT "fk_role_section_permission_role" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_section_permission" ADD CONSTRAINT "fk_role_section_permission_section" FOREIGN KEY ("section_code") REFERENCES "app_section"("code") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_special_permission" ADD CONSTRAINT "fk_role_special_permission_role" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_special_permission" ADD CONSTRAINT "fk_role_special_permission_permission" FOREIGN KEY ("permission_code") REFERENCES "special_permission"("code") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_special_permission" DROP CONSTRAINT "fk_role_special_permission_permission"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_special_permission" DROP CONSTRAINT "fk_role_special_permission_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_section_permission" DROP CONSTRAINT "fk_role_section_permission_section"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_section_permission" DROP CONSTRAINT "fk_role_section_permission_role"`,
    );
    await queryRunner.query(`ALTER TABLE "app_user" DROP CONSTRAINT "fk_app_user_created_by"`);
    await queryRunner.query(`ALTER TABLE "app_user" DROP CONSTRAINT "fk_app_user_role"`);
    await queryRunner.query(`ALTER TABLE "auth_session" DROP CONSTRAINT "fk_auth_session_user"`);
    await queryRunner.query(`DROP TABLE "special_permission"`);
    await queryRunner.query(`DROP TABLE "role"`);
    await queryRunner.query(`DROP TABLE "role_special_permission"`);
    await queryRunner.query(`DROP TABLE "role_section_permission"`);
    await queryRunner.query(`DROP INDEX "public"."idx_app_user_role_id"`);
    await queryRunner.query(`DROP TABLE "app_user"`);
    await queryRunner.query(`DROP TABLE "app_section"`);
    await queryRunner.query(`DROP INDEX "public"."idx_otp_challenge_mobile_created_at"`);
    await queryRunner.query(`DROP TABLE "otp_challenge"`);
    await queryRunner.query(`DROP INDEX "public"."idx_auth_session_user_id_active"`);
    await queryRunner.query(`DROP TABLE "auth_session"`);
  }
}
