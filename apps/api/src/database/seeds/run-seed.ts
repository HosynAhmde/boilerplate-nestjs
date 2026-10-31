import 'reflect-metadata';
import { normalizeMobile } from '../../common/mobile.js';
import { loadDotEnv } from '../../config/env.js';
import AppDataSource from '../data-source.js';

/**
 * Idempotent seed: creates the system admin role with every permission and
 * the first admin user (SEED_ADMIN_MOBILE). Safe to run more than once.
 */
loadDotEnv();
const mobile = normalizeMobile(process.env.SEED_ADMIN_MOBILE ?? '');
const fullName = process.env.SEED_ADMIN_FULL_NAME?.trim() || 'مدیر سیستم';
if (!mobile) {
  console.error('SEED_ADMIN_MOBILE is missing or invalid (expected 09xxxxxxxxx)');
  process.exit(1);
}

await AppDataSource.initialize();
try {
  await AppDataSource.transaction(async (m) => {
    const [role] = (await m.query(
      `INSERT INTO role (name, description, is_system) VALUES ($1, $2, true)
       ON CONFLICT (name) DO UPDATE SET is_system = true
       RETURNING id`,
      ['مدیر سیستم', 'دسترسی کامل به همه بخش‌ها'],
    )) as { id: string }[];

    await m.query(
      `INSERT INTO role_section_permission
         (role_id, section_code, can_view, can_create, can_edit, can_delete, can_approve)
       SELECT $1, code, true, true, true, true, true FROM app_section
       ON CONFLICT (role_id, section_code) DO UPDATE
         SET can_view = true, can_create = true, can_edit = true, can_delete = true, can_approve = true`,
      [role!.id],
    );
    await m.query(
      `INSERT INTO role_special_permission (role_id, permission_code)
       SELECT $1, code FROM special_permission
       ON CONFLICT DO NOTHING`,
      [role!.id],
    );
    await m.query(
      `INSERT INTO app_user (full_name, mobile, role_id) VALUES ($1, $2, $3)
       ON CONFLICT (mobile) DO NOTHING`,
      [fullName, mobile, role!.id],
    );
  });
  console.log(`Seed done. Admin login mobile: ${mobile}`);
} finally {
  await AppDataSource.destroy();
}
