import { getAggregatedPresence, presenceToHumanTime, statusFromPresence } from '../presence';

const currentTimestamp = Date.now() / 1000;

describe('getAggregatedPresence', () => {
  test('aggregated status is active if any of the client has status active with age less than threshold', () => {
    const presence = {
      website: {
        timestamp: currentTimestamp - 100,
        status: 'idle',
      },
      zulipMobile: {
        timestamp: currentTimestamp - 120,
        status: 'active',
      },
    };

    const expectedResult = {
      client: 'zulipMobile',
      status: 'active',
      timestamp: currentTimestamp - 120,
    };

    expect(getAggregatedPresence(presence)).toEqual(expectedResult);
  });

  test('aggregated status is idle if any of the client has status idle with age less than threshold and no client has status active with age has than threshold', () => {
    const presence = {
      website: {
        timestamp: currentTimestamp - 100,
        status: 'idle',
      },
      zulipMobile: {
        timestamp: currentTimestamp - 220,
        status: 'active',
      },
    };

    const expectedResult = {
      client: 'website',
      status: 'idle',
      timestamp: currentTimestamp - 100,
    };

    expect(getAggregatedPresence(presence)).toEqual(expectedResult);
  });

  test('aggregated status is offline if no client has status active or idle with age less than threshold', () => {
    const presence = {
      zulipMobile: {
        timestamp: currentTimestamp - 400,
        status: 'active',
      },
      website: {
        timestamp: currentTimestamp - 200,
        status: 'idle',
      },
      zulipAndroid: {
        timestamp: currentTimestamp - 500,
        status: 'active',
      },
    };

    const expectedResult = {
      client: '',
      timestamp: 0,
      status: 'offline',
    };

    expect(getAggregatedPresence(presence)).toEqual(expectedResult);
  });

  test('do not consider presence if its age is greater than OFFLINE_THRESHOLD_SECS', () => {
    const presence = {
      website: {
        timestamp: currentTimestamp - 300,
        status: 'active',
      },
      zulipMobile: {
        timestamp: currentTimestamp - 10,
        status: 'idle',
      },
    };

    const expectedResult = {
      client: 'zulipMobile',
      status: 'idle',
      timestamp: currentTimestamp - 10,
    };

    expect(getAggregatedPresence(presence)).toEqual(expectedResult);
  });

  test('Do not consider old aggregated', () => {
    const presence = {
      aggregated: {
        client: 'website',
        status: 'active',
        timestamp: currentTimestamp - 100,
      },
      website: {
        status: 'idle',
        timestamp: currentTimestamp - 10,
      },
    };

    const expectedResult = {
      client: 'website',
      status: 'idle',
      timestamp: currentTimestamp - 10,
    };

    expect(getAggregatedPresence(presence)).toEqual(expectedResult);
  });
});

describe('presenceToHumanTime', () => {
  test('passing an invalid value does not throw but returns "never"', () => {
    expect(presenceToHumanTime(undefined)).toBe('never');
  });

  test('given a presence return human readable time', () => {
    const presence = {
      aggregated: {
        timestamp: currentTimestamp - 240,
      },
    };
    expect(presenceToHumanTime(presence)).toBe('4 minutes ago');
  });

  test('if less than a threshold, the user is currently active', () => {
    const presence = {
      aggregated: {
        timestamp: currentTimestamp - 100,
      },
    };
    expect(presenceToHumanTime(presence)).toBe('now');
  });
});

describe('statusFromPresence', () => {
  test('invalid input does not throw but returns "offline"', () => {
    expect(statusFromPresence(undefined)).toBe('offline');
    expect(statusFromPresence({})).toBe('offline');
    expect(statusFromPresence('something invalid')).toBe('offline');
  });

  test('if aggregate status is "offline" the result is always "offline"', () => {
    const presence = {
      aggregated: {
        status: 'offline',
      },
    };
    const result = statusFromPresence(presence);
    expect(result).toBe('offline');
  });

  test('if status is not "offline" but last activity was more than 1hr ago result is still "offline"', () => {
    const presence = {
      aggregated: {
        status: 'active',
        timestamp: Math.trunc(Date.now() / 1000 - 2 * 60 * 60), // two hours
      },
    };
    const result = statusFromPresence(presence);
    expect(result).toBe('offline');
  });

  test('if status is  "idle" and last activity is less than 140 seconds then result remain "idle"', () => {
    const presence = {
      aggregated: {
        status: 'idle',
        timestamp: Math.trunc(Date.now() / 1000 - 60), // 1 minute
      },
    };
    const result = statusFromPresence(presence);
    expect(result).toBe('idle');
  });

  test('if status is not "offline" and last activity was less than 5min ago result is "active"', () => {
    const presence = {
      aggregated: {
        status: 'active',
        timestamp: Math.trunc(Date.now() / 1000 - 60), // 1 minute
      },
    };
    const result = statusFromPresence(presence);
    expect(result).toBe('active');
  });
});
