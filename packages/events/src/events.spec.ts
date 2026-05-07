import { QUEUES, DEFAULT_JOB_OPTIONS } from './queues';
import { KAFKA_TOPICS } from './topics';

describe('QUEUES', () => {
  it('has the EMAIL key', () => {
    expect(QUEUES).toHaveProperty('EMAIL');
  });

  it('has the SMS key', () => {
    expect(QUEUES).toHaveProperty('SMS');
  });

  it('has the PUSH key', () => {
    expect(QUEUES).toHaveProperty('PUSH');
  });

  it('has the ATTENDANCE_ALERT key', () => {
    expect(QUEUES).toHaveProperty('ATTENDANCE_ALERT');
  });

  it('has the FEE_PAYMENT_RECEIVED key', () => {
    expect(QUEUES).toHaveProperty('FEE_PAYMENT_RECEIVED');
  });

  it('has the EXAM_RESULT_PUBLISHED key', () => {
    expect(QUEUES).toHaveProperty('EXAM_RESULT_PUBLISHED');
  });

  it('all QUEUES values are non-empty strings', () => {
    const values = Object.values(QUEUES);
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all QUEUES values are unique (no duplicates)', () => {
    const values = Object.values(QUEUES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('queue names follow queue: prefix convention', () => {
    const values = Object.values(QUEUES);
    for (const value of values) {
      expect(value.startsWith('queue:')).toBe(true);
    }
  });

  it('has at least 10 queue entries', () => {
    expect(Object.keys(QUEUES).length).toBeGreaterThanOrEqual(10);
  });
});

describe('DEFAULT_JOB_OPTIONS', () => {
  it('has an attempts property', () => {
    expect(DEFAULT_JOB_OPTIONS).toHaveProperty('attempts');
  });

  it('has a backoff property', () => {
    expect(DEFAULT_JOB_OPTIONS).toHaveProperty('backoff');
  });

  it('attempts is a positive number', () => {
    expect(typeof DEFAULT_JOB_OPTIONS.attempts).toBe('number');
    expect(DEFAULT_JOB_OPTIONS.attempts).toBeGreaterThan(0);
  });

  it('backoff has a type property', () => {
    expect(DEFAULT_JOB_OPTIONS.backoff).toHaveProperty('type');
  });

  it('backoff has a delay property', () => {
    expect(DEFAULT_JOB_OPTIONS.backoff).toHaveProperty('delay');
  });

  it('backoff delay is a positive number', () => {
    expect(DEFAULT_JOB_OPTIONS.backoff.delay).toBeGreaterThan(0);
  });
});

describe('KAFKA_TOPICS', () => {
  it('has the USER_CREATED key', () => {
    expect(KAFKA_TOPICS).toHaveProperty('USER_CREATED');
  });

  it('has the STUDENT_ADMITTED key', () => {
    expect(KAFKA_TOPICS).toHaveProperty('STUDENT_ADMITTED');
  });

  it('has the ATTENDANCE_MARKED key', () => {
    expect(KAFKA_TOPICS).toHaveProperty('ATTENDANCE_MARKED');
  });

  it('has the FEE_PAYMENT_RECEIVED key', () => {
    expect(KAFKA_TOPICS).toHaveProperty('FEE_PAYMENT_RECEIVED');
  });

  it('has the EXAM_RESULTS_PUBLISHED key', () => {
    expect(KAFKA_TOPICS).toHaveProperty('EXAM_RESULTS_PUBLISHED');
  });

  it('has the NOTIFICATION_SEND key', () => {
    expect(KAFKA_TOPICS).toHaveProperty('NOTIFICATION_SEND');
  });

  it('all KAFKA_TOPICS values are non-empty strings', () => {
    const values = Object.values(KAFKA_TOPICS);
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all KAFKA_TOPICS values are unique (no duplicates)', () => {
    const values = Object.values(KAFKA_TOPICS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('has at least 15 topic entries', () => {
    expect(Object.keys(KAFKA_TOPICS).length).toBeGreaterThanOrEqual(15);
  });
});
