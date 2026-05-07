import axios from 'axios';
import { HealthMonitor } from './health.monitor';

// Mock axios at module level
jest.mock('axios');

// Mock MqttPublisher
const mockPublisher = {
  publishDeviceStatus: jest.fn(),
  publishPunch: jest.fn(),
};

describe('HealthMonitor', () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.post as jest.Mock).mockResolvedValue({});
    // Construct with a single device — do NOT call .start()
    monitor = new HealthMonitor(['TestGate'], mockPublisher as any);
  });

  // ── constructor ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('initializes devices with UNKNOWN status and null lastSeen', () => {
      const statuses = monitor.getStatus();
      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toMatchObject({
        name: 'TestGate',
        status: 'UNKNOWN',
        lastSeen: null,
      });
    });
  });

  // ── getStatus ──────────────────────────────────────────────────────────────

  describe('getStatus()', () => {
    it('returns array with one entry per device name', () => {
      const multiMonitor = new HealthMonitor(['Gate1', 'Gate2', 'Gate3'], mockPublisher as any);
      const statuses = multiMonitor.getStatus();
      expect(statuses).toHaveLength(3);
      expect(statuses.map((s) => s.name)).toEqual(['Gate1', 'Gate2', 'Gate3']);
    });
  });

  // ── recordActivity ─────────────────────────────────────────────────────────

  describe('recordActivity()', () => {
    it('sets status to ONLINE and updates lastSeen to a Date', () => {
      monitor.recordActivity('TestGate');

      const statuses = monitor.getStatus();
      expect(statuses[0].status).toBe('ONLINE');
      expect(statuses[0].lastSeen).toBeInstanceOf(Date);
    });

    it('publishes ONLINE device status when device was previously OFFLINE', () => {
      // Manually set to OFFLINE first
      (monitor as any).devices.get('TestGate').status = 'OFFLINE';

      monitor.recordActivity('TestGate');

      expect(mockPublisher.publishDeviceStatus).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishDeviceStatus).toHaveBeenCalledWith(
        'TestGate',
        'ONLINE',
        expect.any(String)
      );
    });

    it('does NOT call publishDeviceStatus when device was already ONLINE', () => {
      // Set to ONLINE first so wasOffline is false
      (monitor as any).devices.get('TestGate').status = 'ONLINE';
      (monitor as any).devices.get('TestGate').lastSeen = new Date();

      monitor.recordActivity('TestGate');

      expect(mockPublisher.publishDeviceStatus).not.toHaveBeenCalled();
    });

    it('does nothing when deviceName is not in the registered list', () => {
      // Should not throw and no side effects
      expect(() => monitor.recordActivity('UnknownDevice')).not.toThrow();
      expect(mockPublisher.publishDeviceStatus).not.toHaveBeenCalled();
    });
  });

  // ── getStatus after recordActivity ─────────────────────────────────────────

  describe('getStatus() after recordActivity', () => {
    it('reflects ONLINE status after recordActivity is called', () => {
      monitor.recordActivity('TestGate');

      const statuses = monitor.getStatus();
      expect(statuses[0].status).toBe('ONLINE');
      expect(statuses[0].lastSeen).not.toBeNull();
    });
  });
});
