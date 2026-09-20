import { describe, expect, it } from 'vitest';
import { getActiveNavigationPath } from '@/lib/admin-navigation';

const paths = [
  '/admin',
  '/admin/msat',
  '/admin/msat/questions',
  '/admin/msat/create',
  '/admin/msat/results',
];

describe('admin navigation active route', () => {
  it('uses the most specific route for the MSAT question bank', () => {
    expect(getActiveNavigationPath('/admin/msat/questions', paths)).toBe('/admin/msat/questions');
  });

  it('uses the most specific route for MSAT creation', () => {
    expect(getActiveNavigationPath('/admin/msat/create', paths)).toBe('/admin/msat/create');
  });

  it('keeps dynamic exam details under live monitor', () => {
    expect(getActiveNavigationPath('/admin/msat/exam-123', paths)).toBe('/admin/msat');
  });

  it('does not let the admin root capture every admin page', () => {
    expect(getActiveNavigationPath('/admin/msat/results', paths)).toBe('/admin/msat/results');
  });
});
