import { AuthSession } from '../auth/entities/auth-session.entity.js';
import { OtpChallenge } from '../auth/entities/otp-challenge.entity.js';
import { AppSection } from '../iam/entities/app-section.entity.js';
import { AppUser } from '../iam/entities/app-user.entity.js';
import { RoleSectionPermission } from '../iam/entities/role-section-permission.entity.js';
import { RoleSpecialPermission } from '../iam/entities/role-special-permission.entity.js';
import { Role } from '../iam/entities/role.entity.js';
import { SpecialPermission } from '../iam/entities/special-permission.entity.js';

/**
 * Every TypeORM entity, listed explicitly. Explicit is safer than a glob under
 * ESM and works the same in the app, the CLI and tests. Add new entities here.
 */
export const entities = [
  Role,
  AppUser,
  AppSection,
  RoleSectionPermission,
  SpecialPermission,
  RoleSpecialPermission,
  OtpChallenge,
  AuthSession,
];
