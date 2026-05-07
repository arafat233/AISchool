// test-setup.ts runs before this file and sets SCHOOL_ID + DEVICES
// so the config module import below will succeed without process.exit(1)
import { parseDevices } from './config';

describe('parseDevices()', () => {
  it('parses a single device string into a DeviceConfig array', () => {
    process.env.DEVICES = 'MainGate:192.168.1.201:4370';

    const devices = parseDevices();

    expect(devices).toHaveLength(1);
    expect(devices[0]).toEqual({ name: 'MainGate', host: '192.168.1.201', port: 4370 });
  });

  it('parses multiple comma-separated devices', () => {
    process.env.DEVICES = 'Gate1:10.0.0.1:4370,Gate2:10.0.0.2:4371';
    // parseDevices reads from config.DEVICES which is frozen at import time,
    // so we also patch it directly for subsequent calls
    const { config } = require('./config');
    config.DEVICES = 'Gate1:10.0.0.1:4370,Gate2:10.0.0.2:4371';

    const devices = parseDevices();

    expect(devices).toHaveLength(2);
    expect(devices[0]).toMatchObject({ name: 'Gate1', host: '10.0.0.1', port: 4370 });
    expect(devices[1]).toMatchObject({ name: 'Gate2', host: '10.0.0.2', port: 4371 });
  });

  it('defaults port to 4370 when port segment is omitted', () => {
    const { config } = require('./config');
    config.DEVICES = 'StaffGate:10.0.0.5';
    // parseDevices splits on ":" — port will be undefined → defaults to 4370
    const devices = parseDevices();

    expect(devices[0].port).toBe(4370);
    expect(devices[0].name).toBe('StaffGate');
    expect(devices[0].host).toBe('10.0.0.5');
  });

  it('returns device objects with name (string), host (string), and port (number)', () => {
    const { config } = require('./config');
    config.DEVICES = 'Main:192.168.0.1:4370';

    const devices = parseDevices();

    expect(typeof devices[0].name).toBe('string');
    expect(typeof devices[0].host).toBe('string');
    expect(typeof devices[0].port).toBe('number');
  });
});
