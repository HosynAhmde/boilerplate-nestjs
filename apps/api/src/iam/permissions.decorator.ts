import { SetMetadata } from '@nestjs/common';
import type { SectionAction } from './entities/role-section-permission.entity.js';

export const SECTION_PERMISSION_KEY = 'sectionPermission';
export const SPECIAL_PERMISSION_KEY = 'specialPermission';

export interface SectionRequirement {
  section: string;
  action: SectionAction;
}

/** Requires a section permission, e.g. `@RequireSection('ORDERS', 'create')`. */
export const RequireSection = (section: string, action: SectionAction) =>
  SetMetadata(SECTION_PERMISSION_KEY, { section, action } satisfies SectionRequirement);

/** Requires every listed sensitive-operation grant, e.g. `@RequireSpecial('INVOICE_VOID')`. */
export const RequireSpecial = (...codes: string[]) => SetMetadata(SPECIAL_PERMISSION_KEY, codes);
