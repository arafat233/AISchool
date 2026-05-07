import axios from 'axios';
import { ConflictService, ConflictCheckParams, FlagConflictDto } from './conflict.service';

// Mock axios at module level
jest.mock('axios');

// Mock AttendanceClient
const mockAttendanceClient = {
  getManualAttendance: jest.fn(),
};

describe('ConflictService', () => {
  let service: ConflictService;

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.post as jest.Mock).mockResolvedValue({});
    service = new ConflictService(mockAttendanceClient as any);
  });

  // ── checkConflict ──────────────────────────────────────────────────────────

  describe('checkConflict', () => {
    const baseParams: ConflictCheckParams = {
      schoolId: 'school-1',
      userId: 'user-1',
      userType: 'STUDENT',
      recordTime: new Date('2026-04-15T08:00:00Z'),
      biometricPunchType: 'CHECK_IN',
    };

    it('returns null when no manual record exists', async () => {
      mockAttendanceClient.getManualAttendance.mockResolvedValue(null);

      const result = await service.checkConflict(baseParams);

      expect(result).toBeNull();
      expect(mockAttendanceClient.getManualAttendance).toHaveBeenCalledWith(
        'user-1',
        'STUDENT',
        '2026-04-15',
        'school-1'
      );
    });

    it('returns null when existing record has source = "BIOMETRIC"', async () => {
      mockAttendanceClient.getManualAttendance.mockResolvedValue({
        status: 'ABSENT',
        source: 'BIOMETRIC',
      });

      const result = await service.checkConflict(baseParams);

      expect(result).toBeNull();
    });

    it('returns conflict record when existing status differs from biometric status', async () => {
      mockAttendanceClient.getManualAttendance.mockResolvedValue({
        status: 'ABSENT',
        source: 'MANUAL',
      });

      const result = await service.checkConflict(baseParams);

      expect(result).not.toBeNull();
      expect(result).toEqual({ manualStatus: 'ABSENT', source: 'MANUAL' });
    });

    it('returns null when existing status matches biometric ("PRESENT" vs "PRESENT")', async () => {
      mockAttendanceClient.getManualAttendance.mockResolvedValue({
        status: 'PRESENT',
        source: 'MANUAL',
      });

      const result = await service.checkConflict(baseParams);

      expect(result).toBeNull();
    });
  });

  // ── flagConflict ───────────────────────────────────────────────────────────

  describe('flagConflict', () => {
    const dto: FlagConflictDto = {
      schoolId: 'school-1',
      userId: 'user-1',
      userType: 'STUDENT',
      recordTime: new Date('2026-04-15T08:00:00Z'),
      biometricStatus: 'PRESENT',
      manualStatus: 'ABSENT',
      deviceName: 'MainGate',
    };

    it('calls axios.post to the attendance service conflict endpoint with correct payload', async () => {
      await service.flagConflict(dto);

      expect(axios.post).toHaveBeenCalledTimes(1);
      const [url, payload] = (axios.post as jest.Mock).mock.calls[0];
      expect(url).toContain('/biometric/conflict');
      expect(payload).toMatchObject({
        schoolId: 'school-1',
        userId: 'user-1',
        userType: 'STUDENT',
        biometricStatus: 'PRESENT',
        manualStatus: 'ABSENT',
        deviceName: 'MainGate',
        status: 'PENDING_REVIEW',
      });
      expect(payload.date).toBe('2026-04-15');
    });

    it('swallows errors gracefully when axios.post rejects', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(service.flagConflict(dto)).resolves.toBeUndefined();
    });
  });
});
