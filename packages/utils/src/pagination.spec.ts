import { parsePagination, buildPaginatedResult, buildPrismaOrderBy } from './pagination';

describe('parsePagination', () => {
  it('returns defaults when no query params provided', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('caps limit at 100', () => {
    const result = parsePagination({ page: '1', limit: '999' });
    expect(result.limit).toBe(100);
    expect(result.take).toBe(100);
  });

  it('clamps page below 1 to 1', () => {
    const result = parsePagination({ page: '-5', limit: '10' });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('handles string inputs correctly', () => {
    const result = parsePagination({ page: '3', limit: '15' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(15);
  });

  it('calculates skip correctly for page 2', () => {
    const result = parsePagination({ page: '2', limit: '10' });
    expect(result.skip).toBe(10);
  });

  it('calculates skip correctly for page 5 with limit 25', () => {
    const result = parsePagination({ page: '5', limit: '25' });
    expect(result.skip).toBe(100);
  });

  it('enforces minimum limit of 1', () => {
    const result = parsePagination({ page: '1', limit: '0' });
    expect(result.limit).toBe(1);
  });
});

describe('buildPaginatedResult', () => {
  it('sets hasNextPage true when more pages exist', () => {
    const result = buildPaginatedResult([1, 2, 3], 30, 1, 10);
    expect(result.meta.hasNextPage).toBe(true);
  });

  it('sets hasNextPage false on last page', () => {
    const result = buildPaginatedResult([1, 2, 3], 30, 3, 10);
    expect(result.meta.hasNextPage).toBe(false);
  });

  it('sets hasPrevPage false on first page', () => {
    const result = buildPaginatedResult([1, 2, 3], 30, 1, 10);
    expect(result.meta.hasPrevPage).toBe(false);
  });

  it('sets hasPrevPage true on page 2+', () => {
    const result = buildPaginatedResult([1, 2, 3], 30, 2, 10);
    expect(result.meta.hasPrevPage).toBe(true);
  });

  it('calculates totalPages correctly', () => {
    const result = buildPaginatedResult([], 25, 1, 10);
    expect(result.meta.totalPages).toBe(3);
  });

  it('calculates totalPages for exact divisor', () => {
    const result = buildPaginatedResult([], 20, 1, 10);
    expect(result.meta.totalPages).toBe(2);
  });

  it('handles empty data array', () => {
    const result = buildPaginatedResult([], 0, 1, 20);
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
    expect(result.meta.hasNextPage).toBe(false);
    expect(result.meta.hasPrevPage).toBe(false);
  });

  it('returns data as provided', () => {
    const data = [{ id: 'a' }, { id: 'b' }];
    const result = buildPaginatedResult(data, 2, 1, 20);
    expect(result.data).toBe(data);
  });
});

describe('buildPrismaOrderBy', () => {
  it('returns undefined when no sortBy provided', () => {
    expect(buildPrismaOrderBy()).toBeUndefined();
    expect(buildPrismaOrderBy(undefined)).toBeUndefined();
  });

  it('returns object with field and direction', () => {
    expect(buildPrismaOrderBy('name', 'desc')).toEqual({ name: 'desc' });
  });

  it('defaults sortOrder to asc', () => {
    expect(buildPrismaOrderBy('createdAt')).toEqual({ createdAt: 'asc' });
  });

  it('handles asc direction explicitly', () => {
    expect(buildPrismaOrderBy('email', 'asc')).toEqual({ email: 'asc' });
  });
});
