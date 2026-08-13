// Deterministic day arithmetic for the streak/daily-reward tests.
process.env.TZ = 'UTC';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);