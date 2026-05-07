import { AppError } from './base.error';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  BusinessRuleError,
  TenantMismatchError,
} from './domain.errors';

describe('AppError', () => {
  const err = new AppError('SOME_CODE', 'Something went wrong', 500);

  it('has the correct code', () => {
    expect(err.code).toBe('SOME_CODE');
  });

  it('has the correct statusCode', () => {
    expect(err.statusCode).toBe(500);
  });

  it('has the correct message', () => {
    expect(err.message).toBe('Something went wrong');
  });

  it('sets name to constructor name', () => {
    expect(err.name).toBe('AppError');
  });

  it('is an instance of Error', () => {
    expect(err).toBeInstanceOf(Error);
  });

  it('toJSON returns code, message, statusCode', () => {
    const json = err.toJSON();
    expect(json.code).toBe('SOME_CODE');
    expect(json.message).toBe('Something went wrong');
    expect(json.statusCode).toBe(500);
  });

  it('toJSON does not include details when not provided', () => {
    const json = err.toJSON();
    expect(json).not.toHaveProperty('details');
  });

  it('toJSON includes details when provided', () => {
    const errWithDetails = new AppError('CODE', 'msg', 400, { field: 'name' });
    const json = errWithDetails.toJSON();
    expect(json.details).toEqual({ field: 'name' });
  });

  it('defaults statusCode to 500 when not provided', () => {
    const e = new AppError('ERR', 'error message');
    expect(e.statusCode).toBe(500);
  });
});

describe('NotFoundError', () => {
  it('has statusCode 404', () => {
    const err = new NotFoundError('User');
    expect(err.statusCode).toBe(404);
  });

  it('has code NOT_FOUND', () => {
    const err = new NotFoundError('User');
    expect(err.code).toBe('NOT_FOUND');
  });

  it('message includes the resource name', () => {
    const err = new NotFoundError('Student');
    expect(err.message).toContain('Student');
  });

  it('message includes the id when provided', () => {
    const err = new NotFoundError('Student', 'abc-123');
    expect(err.message).toContain('abc-123');
  });

  it('message does not mention id when not provided', () => {
    const err = new NotFoundError('Student');
    expect(err.message).not.toContain('"');
  });

  it('is an instance of Error', () => {
    expect(new NotFoundError('X')).toBeInstanceOf(Error);
  });

  it('is an instance of AppError', () => {
    expect(new NotFoundError('X')).toBeInstanceOf(AppError);
  });
});

describe('ConflictError', () => {
  const err = new ConflictError('Email already exists');

  it('has statusCode 409', () => {
    expect(err.statusCode).toBe(409);
  });

  it('has code CONFLICT', () => {
    expect(err.code).toBe('CONFLICT');
  });

  it('has the provided message', () => {
    expect(err.message).toBe('Email already exists');
  });

  it('is an instance of AppError', () => {
    expect(err).toBeInstanceOf(AppError);
  });

  it('is an instance of Error', () => {
    expect(err).toBeInstanceOf(Error);
  });
});

describe('ValidationError', () => {
  const err = new ValidationError('Invalid input', [{ field: 'email', msg: 'required' }]);

  it('has statusCode 422', () => {
    expect(err.statusCode).toBe(422);
  });

  it('has code VALIDATION_ERROR', () => {
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('preserves details', () => {
    const json = err.toJSON();
    expect(json.details).toEqual([{ field: 'email', msg: 'required' }]);
  });

  it('works without details', () => {
    const e = new ValidationError('Bad input');
    expect(e.statusCode).toBe(422);
    expect(e.toJSON()).not.toHaveProperty('details');
  });

  it('is an instance of AppError', () => {
    expect(err).toBeInstanceOf(AppError);
  });

  it('is an instance of Error', () => {
    expect(err).toBeInstanceOf(Error);
  });
});

describe('BusinessRuleError', () => {
  const err = new BusinessRuleError('FEE_OVERDUE', 'Fee payment is overdue');

  it('has statusCode 422', () => {
    expect(err.statusCode).toBe(422);
  });

  it('has the custom code provided', () => {
    expect(err.code).toBe('FEE_OVERDUE');
  });

  it('has the provided message', () => {
    expect(err.message).toBe('Fee payment is overdue');
  });

  it('is an instance of AppError', () => {
    expect(err).toBeInstanceOf(AppError);
  });

  it('is an instance of Error', () => {
    expect(err).toBeInstanceOf(Error);
  });
});

describe('TenantMismatchError', () => {
  const err = new TenantMismatchError();

  it('has statusCode 403', () => {
    expect(err.statusCode).toBe(403);
  });

  it('has code TENANT_MISMATCH', () => {
    expect(err.code).toBe('TENANT_MISMATCH');
  });

  it('has a descriptive message', () => {
    expect(err.message.length).toBeGreaterThan(0);
  });

  it('is an instance of AppError', () => {
    expect(err).toBeInstanceOf(AppError);
  });

  it('is an instance of Error', () => {
    expect(err).toBeInstanceOf(Error);
  });
});
