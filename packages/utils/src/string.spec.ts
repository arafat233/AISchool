import {
  slugify,
  capitalizeFirst,
  titleCase,
  truncate,
  maskEmail,
  maskPhone,
  generateAdmissionNumber,
  generateReceiptNumber,
} from './string';

describe('slugify', () => {
  it('converts spaces to dashes', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('converts uppercase to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('hello! @world#')).toBe('hello-world');
  });

  it('strips leading and trailing dashes', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('collapses multiple spaces/dashes into one dash', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('capitalizeFirst', () => {
  it('capitalizes first character and lowercases rest', () => {
    expect(capitalizeFirst('hELLO')).toBe('Hello');
  });

  it('handles already capitalized string', () => {
    expect(capitalizeFirst('Hello')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(capitalizeFirst('')).toBe('');
  });

  it('handles single character', () => {
    expect(capitalizeFirst('a')).toBe('A');
  });
});

describe('titleCase', () => {
  it('capitalizes each word', () => {
    expect(titleCase('hello world')).toBe('Hello World');
  });

  it('handles mixed case input', () => {
    expect(titleCase('hELLO wORLD')).toBe('Hello World');
  });

  it('handles single word', () => {
    expect(titleCase('test')).toBe('Test');
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings and appends default suffix', () => {
    const result = truncate('hello world', 8);
    expect(result).toBe('hello...');
    expect(result.length).toBe(8);
  });

  it('uses custom suffix when provided', () => {
    // slice(0, 7 - 1) + '…' = 'hello ' + '…' = 'hello …'
    const result = truncate('hello world', 7, '…');
    expect(result).toBe('hello …');
    expect(result.length).toBe(7);
  });

  it('returns string of exactly maxLength when truncated', () => {
    const result = truncate('abcdefghij', 5);
    expect(result.length).toBe(5);
  });

  it('does not truncate string of exact maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('maskEmail', () => {
  it('masks email keeping first 2 chars of local part', () => {
    expect(maskEmail('john.doe@gmail.com')).toBe('jo******@gmail.com');
  });

  it('preserves domain part', () => {
    const masked = maskEmail('alice@example.com');
    expect(masked.endsWith('@example.com')).toBe(true);
  });

  it('shows first 2 chars of local part', () => {
    const masked = maskEmail('alice@example.com');
    expect(masked.startsWith('al')).toBe(true);
  });

  it('returns original email if no @ sign', () => {
    expect(maskEmail('invalidemail')).toBe('invalidemail');
  });
});

describe('maskPhone', () => {
  it('masks middle digits of phone number', () => {
    const masked = maskPhone('+919876543210');
    expect(masked).toContain('****');
    expect(masked).toContain('+91');
  });

  it('preserves last 4 digits', () => {
    const masked = maskPhone('+919876543210');
    expect(masked.endsWith('3210')).toBe(true);
  });

  it('returns a shorter string than original (masking applied)', () => {
    const original = '+919876543210';
    const masked = maskPhone(original);
    expect(masked.length).toBeLessThan(original.length);
  });
});

describe('generateAdmissionNumber', () => {
  it('generates format PREFIX/YEAR/0001', () => {
    expect(generateAdmissionNumber('STU', 2024, 1)).toBe('STU/2024/0001');
  });

  it('pads sequence to 4 digits', () => {
    expect(generateAdmissionNumber('ADM', 2025, 42)).toBe('ADM/2025/0042');
  });

  it('handles 4-digit sequence without padding', () => {
    expect(generateAdmissionNumber('ADM', 2025, 1000)).toBe('ADM/2025/1000');
  });
});

describe('generateReceiptNumber', () => {
  it('generates format PREFIX followed by 8-digit padded sequence', () => {
    expect(generateReceiptNumber('RCP', 1)).toBe('RCP00000001');
  });

  it('pads sequence to 8 digits', () => {
    expect(generateReceiptNumber('INV', 123)).toBe('INV00000123');
  });

  it('handles large sequence numbers', () => {
    expect(generateReceiptNumber('RCP', 12345678)).toBe('RCP12345678');
  });
});
