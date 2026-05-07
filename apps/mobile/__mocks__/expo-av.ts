/**
 * Mock for expo-av (Audio/Video).
 */
export const Audio = {
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  setAudioModeAsync: jest.fn(async () => {}),

  Sound: {
    createAsync: jest.fn(async () => ({
      sound: {
        playAsync: jest.fn(async () => {}),
        pauseAsync: jest.fn(async () => {}),
        stopAsync: jest.fn(async () => {}),
        unloadAsync: jest.fn(async () => {}),
        setOnPlaybackStatusUpdate: jest.fn(),
        getStatusAsync: jest.fn(async () => ({ isLoaded: true, isPlaying: false, positionMillis: 0 })),
      },
      status: { isLoaded: true },
    })),
  },

  RecordingOptionsPresets: {
    HIGH_QUALITY: {},
    LOW_QUALITY: {},
  },

  Recording: jest.fn().mockImplementation(() => ({
    prepareToRecordAsync: jest.fn(async () => {}),
    startAsync: jest.fn(async () => {}),
    stopAndUnloadAsync: jest.fn(async () => {}),
    getURI: jest.fn(() => 'file://mock-recording.m4a'),
    getStatusAsync: jest.fn(async () => ({ isRecording: false, durationMillis: 0 })),
  })),
};

export const Video = jest.fn(() => null);
export const ResizeMode = { CONTAIN: 'contain', COVER: 'cover', STRETCH: 'stretch' };
