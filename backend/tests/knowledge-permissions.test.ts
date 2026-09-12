import { hasPermission } from '../src/domain/permissions/permissions.matrix';
import { UserRole } from '@sicp/shared';

describe('Knowledge & Solution Memory RBAC Permissions Matrix', () => {
  it('grants Citizen permission to view solutions, compare, search knowledge, and use assistant', () => {
    expect(hasPermission(UserRole.CITIZEN, 'solution:view')).toBe(true);
    expect(hasPermission(UserRole.CITIZEN, 'solution:compare')).toBe(true);
    expect(hasPermission(UserRole.CITIZEN, 'knowledge:search')).toBe(true);
    expect(hasPermission(UserRole.CITIZEN, 'knowledge:assistant')).toBe(true);
  });

  it('denies Citizen mutating, reviewing, or administrative knowledge permissions', () => {
    expect(hasPermission(UserRole.CITIZEN, 'solution:create')).toBe(false);
    expect(hasPermission(UserRole.CITIZEN, 'solution:edit')).toBe(false);
    expect(hasPermission(UserRole.CITIZEN, 'solution:review')).toBe(false);
    expect(hasPermission(UserRole.CITIZEN, 'solution:publish')).toBe(false);
    expect(hasPermission(UserRole.CITIZEN, 'knowledge:admin')).toBe(false);
  });

  it('grants Government Officer full solution review, publishing, and analytics permissions', () => {
    expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'solution:view')).toBe(true);
    expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'solution:create')).toBe(true);
    expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'solution:edit')).toBe(true);
    expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'solution:review')).toBe(true);
    expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'solution:publish')).toBe(true);
    expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'knowledge:analytics')).toBe(true);
  });

  it('grants Faculty permission to author and edit solutions, but restricts publishing', () => {
    expect(hasPermission(UserRole.FACULTY, 'solution:view')).toBe(true);
    expect(hasPermission(UserRole.FACULTY, 'solution:create')).toBe(true);
    expect(hasPermission(UserRole.FACULTY, 'solution:edit')).toBe(true);
    expect(hasPermission(UserRole.FACULTY, 'solution:publish')).toBe(false);
  });

  it('grants System Admin all solution and knowledge permissions', () => {
    const permissions: Array<
      | 'solution:view'
      | 'solution:create'
      | 'solution:edit'
      | 'solution:review'
      | 'solution:publish'
      | 'solution:compare'
      | 'knowledge:search'
      | 'knowledge:analytics'
      | 'knowledge:assistant'
      | 'knowledge:admin'
    > = [
      'solution:view',
      'solution:create',
      'solution:edit',
      'solution:review',
      'solution:publish',
      'solution:compare',
      'knowledge:search',
      'knowledge:analytics',
      'knowledge:assistant',
      'knowledge:admin',
    ];

    for (const perm of permissions) {
      expect(hasPermission(UserRole.SYSTEM_ADMIN, perm)).toBe(true);
    }
  });
});
