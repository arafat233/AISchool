import { LoggerService } from './logger.service';

// Mock winston so no file transport is created during tests
jest.mock('./logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  }),
}));

describe('LoggerService', () => {
  let service: LoggerService;
  let mockWinston: { info: jest.Mock; error: jest.Mock; warn: jest.Mock; debug: jest.Mock; verbose: jest.Mock };

  beforeEach(() => {
    const { createLogger } = require('./logger');
    service = new LoggerService('TestContext');
    mockWinston = (createLogger as jest.Mock).mock.results.at(-1).value;
    jest.clearAllMocks();
  });

  it('calls info for log()', () => {
    service.log('hello world');
    expect(mockWinston.info).toHaveBeenCalledWith('hello world', expect.objectContaining({ context: undefined }));
  });

  it('passes context to info when provided', () => {
    service.log('hello', 'MyService');
    expect(mockWinston.info).toHaveBeenCalledWith('hello', expect.objectContaining({ context: 'MyService' }));
  });

  it('calls error for error()', () => {
    service.error('something broke', 'stack trace');
    expect(mockWinston.error).toHaveBeenCalledWith('something broke', expect.objectContaining({ trace: 'stack trace' }));
  });

  it('calls warn for warn()', () => {
    service.warn('low memory');
    expect(mockWinston.warn).toHaveBeenCalledWith('low memory', expect.anything());
  });

  it('calls debug for debug()', () => {
    service.debug('debug info');
    expect(mockWinston.debug).toHaveBeenCalledWith('debug info', expect.anything());
  });

  it('calls verbose for verbose()', () => {
    service.verbose('verbose detail');
    expect(mockWinston.verbose).toHaveBeenCalledWith('verbose detail', expect.anything());
  });

  it('creates logger with default context when none provided', () => {
    const { createLogger } = require('./logger');
    new LoggerService();
    expect(createLogger).toHaveBeenCalledWith('NestJS');
  });

  it('creates logger with provided context', () => {
    const { createLogger } = require('./logger');
    new LoggerService('AuthService');
    expect(createLogger).toHaveBeenCalledWith('AuthService');
  });
});
