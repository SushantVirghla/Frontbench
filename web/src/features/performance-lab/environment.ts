import type { BenchmarkEnvironment } from '../../types';

export function getBrowserEnvironment(): BenchmarkEnvironment {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  let browserName = 'Browser';
  let browserVersion = 'Unknown';

  if (/chrome|crios/i.test(userAgent) && !/edg/i.test(userAgent)) {
    browserName = 'Chrome';
    const match = userAgent.match(/(?:chrome|crios)\/(\d+(\.\d+)?)/i);
    if (match) browserVersion = match[1];
  } else if (/edg/i.test(userAgent)) {
    browserName = 'Edge';
    const match = userAgent.match(/edg\/(\d+(\.\d+)?)/i);
    if (match) browserVersion = match[1];
  } else if (/firefox|fxios/i.test(userAgent)) {
    browserName = 'Firefox';
    const match = userAgent.match(/(?:firefox|fxios)\/(\d+(\.\d+)?)/i);
    if (match) browserVersion = match[1];
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browserName = 'Safari';
    const match = userAgent.match(/version\/(\d+(\.\d+)?)/i);
    if (match) browserVersion = match[1];
  }

  // Device memory is an experimental API
  const deviceMemory =
    typeof navigator !== 'undefined' && 'deviceMemory' in navigator
      ? (navigator as unknown as { deviceMemory: number }).deviceMemory
      : null;

  return {
    browserName,
    browserVersion,
    viewport: {
      width: typeof window !== 'undefined' ? window.innerWidth : 1280,
      height: typeof window !== 'undefined' ? window.innerHeight : 800,
    },
    userAgent,
    hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
    deviceMemoryGb: deviceMemory,
    buildType: import.meta.env.DEV ? 'development' : 'production',
    timestamp: new Date().toISOString(),
  };
}
