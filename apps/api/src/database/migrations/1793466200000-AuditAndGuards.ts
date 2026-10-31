import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Database-level safety nets that do not depend on application code:
 * - extensions used later (pg_trgm for customer name search, btree_gist for
 *   non-overlapping wage ranges)
 * - forbid_mutation(): makes append-only tables reject UPDATE/DELETE
 * - audit_log (monthly partitions) and the generic audit_row() trigger,
 *   which reads the acting user from `app.user_id` (see TransactionRunner)
 * - reference rows for the permission matrix
 */
export class AuditAndGuards1793466200000 implements MigrationInterface {
  name = 'AuditAndGuards1793466200000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    await q.query(`
      CREATE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION '% is append-only (%)', TG_TABLE_NAME, TG_OP USING ERRCODE = 'P0001';
      END $$`);

    await q.query(`
      CREATE TABLE audit_log (
        id          bigint GENERATED ALWAYS AS IDENTITY,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        user_id     bigint,
        action      text NOT NULL,
        table_name  text NOT NULL,
        row_id      bigint,
        old_data    jsonb,
        new_data    jsonb,
        context     jsonb,
        CONSTRAINT pk_audit_log PRIMARY KEY (id, occurred_at),
        CONSTRAINT chk_audit_log_action CHECK (action IN ('INSERT','UPDATE','DELETE','ACTION'))
      ) PARTITION BY RANGE (occurred_at)`);
    // Rows outside any monthly partition land here; a scheduled job creates
    // the monthly partitions ahead of time (ensure_audit_partition below).
    await q.query(`CREATE TABLE audit_log_default PARTITION OF audit_log DEFAULT`);
    await q.query(
      `CREATE INDEX idx_audit_log_table_row ON audit_log (table_name, row_id, occurred_at)`,
    );
    await q.query(`CREATE INDEX idx_audit_log_user ON audit_log (user_id, occurred_at)`);

    await q.query(`
      CREATE FUNCTION ensure_audit_partition(p_month date) RETURNS void LANGUAGE plpgsql AS $$
      DECLARE
        v_from date := date_trunc('month', p_month)::date;
        v_to   date := (date_trunc('month', p_month) + interval '1 month')::date;
        v_name text := 'audit_log_' || to_char(v_from, 'YYYYMM');
      BEGIN
        IF to_regclass(v_name) IS NULL THEN
          EXECUTE format(
            'CREATE TABLE %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
            v_name, v_from, v_to);
          EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION forbid_mutation()',
            v_name || '_immutable', v_name);
        END IF;
      END $$`);
    await q.query(`SELECT ensure_audit_partition(now()::date)`);
    await q.query(`SELECT ensure_audit_partition((now() + interval '1 month')::date)`);
    await q.query(`
      CREATE TRIGGER audit_log_default_immutable BEFORE UPDATE OR DELETE ON audit_log_default
        FOR EACH ROW EXECUTE FUNCTION forbid_mutation()`);

    await q.query(`
      CREATE FUNCTION audit_row() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE
        v_user bigint := nullif(current_setting('app.user_id', true), '')::bigint;
        v_old  jsonb;
        v_new  jsonb;
      BEGIN
        IF TG_OP = 'INSERT' THEN
          v_new := to_jsonb(NEW);
        ELSIF TG_OP = 'UPDATE' THEN
          v_old := to_jsonb(OLD);
          SELECT jsonb_object_agg(n.key, n.value) INTO v_new
            FROM jsonb_each(to_jsonb(NEW)) n
           WHERE v_old -> n.key IS DISTINCT FROM n.value;
          IF v_new IS NULL THEN
            RETURN NEW;  -- nothing actually changed
          END IF;
        ELSE
          v_old := to_jsonb(OLD);
        END IF;
        INSERT INTO audit_log (user_id, action, table_name, row_id, old_data, new_data)
        VALUES (v_user, TG_OP, TG_TABLE_NAME,
                (COALESCE(to_jsonb(NEW), v_old) ->> 'id')::bigint, v_old, v_new);
        RETURN COALESCE(NEW, OLD);
      END $$`);

    for (const table of [
      'role',
      'app_user',
      'role_section_permission',
      'role_special_permission',
    ]) {
      await q.query(
        `CREATE TRIGGER ${table}_audit AFTER INSERT OR UPDATE OR DELETE ON ${table}
           FOR EACH ROW EXECUTE FUNCTION audit_row()`,
      );
    }

    await q.query(`
      INSERT INTO app_section (code, title_fa, sort_order) VALUES
        ('USERS_ROLES', 'کاربران و نقش‌ها', 10),
        ('RATES', 'نرخ‌ها', 20),
        ('CATALOG', 'کالاها', 30),
        ('INVENTORY', 'موجودی', 40),
        ('CUSTOMERS', 'مشتریان', 50),
        ('ORDERS', 'سفارش‌ها و فاکتور فروش', 60),
        ('PURCHASE_INVOICES', 'فاکتور خرید', 70),
        ('PAYMENTS', 'پرداخت‌ها و فیش‌ها', 80),
        ('CUSTODY', 'امانات', 90),
        ('DEALERS', 'بنکداران', 100),
        ('SMS', 'پیامک', 110),
        ('REPORTS', 'گزارش‌ها', 120),
        ('SETTINGS', 'تنظیمات', 130)`);
    await q.query(`
      INSERT INTO special_permission (code, title_fa) VALUES
        ('RATE_WAGE_CHANGE', 'تغییر نرخ و اجرت و تأیید نرخ API'),
        ('INVOICE_VOID', 'ویرایش یا ابطال فاکتور'),
        ('RECEIPT_APPROVE', 'تأیید، رد و برگشت فیش'),
        ('CUSTODY_BALANCE_CHANGE', 'تغییر مانده امانت'),
        ('PROFIT_VIEW', 'مشاهده سود'),
        ('FINANCIAL_REPORTS_VIEW', 'گزارش‌های مالی'),
        ('DELIVERY_BEFORE_SETTLEMENT', 'استثنای تحویل پیش از تسویه')`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DELETE FROM special_permission`);
    await q.query(`DELETE FROM app_section`);
    for (const table of [
      'role',
      'app_user',
      'role_section_permission',
      'role_special_permission',
    ]) {
      await q.query(`DROP TRIGGER IF EXISTS ${table}_audit ON ${table}`);
    }
    await q.query(`DROP FUNCTION IF EXISTS audit_row()`);
    await q.query(`DROP TABLE IF EXISTS audit_log`);
    await q.query(`DROP FUNCTION IF EXISTS ensure_audit_partition(date)`);
    await q.query(`DROP FUNCTION IF EXISTS forbid_mutation()`);
  }
}
