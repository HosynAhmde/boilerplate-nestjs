import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequireSection, RequireSpecial } from '../permissions.decorator.js';
import type { PermissionService, RolePermissions } from '../permission.service.js';
import { PermissionsGuard } from './permissions.guard.js';

class Sample {
  @RequireSection('ORDERS', 'create')
  create() {}

  @RequireSpecial('INVOICE_VOID')
  void() {}

  open() {}
}

function ctxFor(handler: keyof Sample, roleId = '1'): ExecutionContext {
  return {
    getHandler: () => Sample.prototype[handler],
    getClass: () => Sample,
    switchToHttp: () => ({ getRequest: () => ({ user: { roleId } }) }),
  } as unknown as ExecutionContext;
}

function guardWith(perms: RolePermissions) {
  const service = {
    can: async (_r: string, s: string, a: string) =>
      perms.sections[s]?.includes(a as never) ?? false,
    hasSpecial: async (_r: string, codes: string[]) =>
      codes.every((c) => perms.special.includes(c)),
  } as unknown as PermissionService;
  return new PermissionsGuard(new Reflector(), service);
}

describe('PermissionsGuard', () => {
  it('allows routes without requirements', async () => {
    await expect(
      guardWith({ sections: {}, special: [] }).canActivate(ctxFor('open')),
    ).resolves.toBe(true);
  });

  it('checks section actions', async () => {
    const allowed = guardWith({ sections: { ORDERS: ['view', 'create'] }, special: [] });
    await expect(allowed.canActivate(ctxFor('create'))).resolves.toBe(true);

    const viewOnly = guardWith({ sections: { ORDERS: ['view'] }, special: [] });
    await expect(viewOnly.canActivate(ctxFor('create'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('checks special permissions', async () => {
    await expect(
      guardWith({ sections: {}, special: ['INVOICE_VOID'] }).canActivate(ctxFor('void')),
    ).resolves.toBe(true);
    await expect(
      guardWith({ sections: {}, special: [] }).canActivate(ctxFor('void')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
