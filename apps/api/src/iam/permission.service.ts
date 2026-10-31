import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import {
  RoleSectionPermission,
  SECTION_ACTIONS,
  type SectionAction,
} from './entities/role-section-permission.entity.js';
import { RoleSpecialPermission } from './entities/role-special-permission.entity.js';

export interface RolePermissions {
  sections: Record<string, SectionAction[]>;
  special: string[];
}

const CACHE_TTL_MS = 30_000;

const COLUMN: Record<SectionAction, keyof RoleSectionPermission> = {
  view: 'canView',
  create: 'canCreate',
  edit: 'canEdit',
  delete: 'canDelete',
  approve: 'canApprove',
};

/**
 * Loads a role's permission matrix. Results are cached in memory for a short
 * time; call `invalidate(roleId)` after changing a role's permissions.
 */
@Injectable()
export class PermissionService {
  private readonly cache = new Map<string, { at: number; value: RolePermissions }>();

  constructor(
    @InjectRepository(RoleSectionPermission)
    private readonly sectionRepo: Repository<RoleSectionPermission>,
    @InjectRepository(RoleSpecialPermission)
    private readonly specialRepo: Repository<RoleSpecialPermission>,
  ) {}

  async forRole(roleId: string): Promise<RolePermissions> {
    const hit = this.cache.get(roleId);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

    const [sections, special] = await Promise.all([
      this.sectionRepo.find({ where: { roleId } }),
      this.specialRepo.find({ where: { roleId } }),
    ]);
    const value: RolePermissions = {
      sections: Object.fromEntries(
        sections.map((s) => [s.sectionCode, SECTION_ACTIONS.filter((a) => s[COLUMN[a]] === true)]),
      ),
      special: special.map((s) => s.permissionCode),
    };
    this.cache.set(roleId, { at: Date.now(), value });
    return value;
  }

  async can(roleId: string, section: string, action: SectionAction): Promise<boolean> {
    const perms = await this.forRole(roleId);
    return perms.sections[section]?.includes(action) ?? false;
  }

  async hasSpecial(roleId: string, codes: string[]): Promise<boolean> {
    const perms = await this.forRole(roleId);
    return codes.every((c) => perms.special.includes(c));
  }

  invalidate(roleId?: string): void {
    if (roleId) this.cache.delete(roleId);
    else this.cache.clear();
  }
}
