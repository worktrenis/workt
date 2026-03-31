// Simple centralized logger with level control.
// Usage: import { logDebug, logInfo, logWarn, logError, setLogLevel } from '../utils/logger';
// Set level via: setLogLevel('info') or using EXPO_PUBLIC_LOG_LEVEL env var.

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
let currentLevelName = (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_LOG_LEVEL) || 'info';
let currentLevel = LEVELS[currentLevelName] ?? LEVELS.info;

export function setLogLevel(level) {
  if (LEVELS[level] !== undefined) {
    currentLevelName = level;
    currentLevel = LEVELS[level];
    console.log(`🔧 Log level impostato a: ${level}`);
  } else {
    console.warn(`⚠️ Log level sconosciuto: ${level}`);
  }
}

function shouldLog(levelName) {
  const lvl = LEVELS[levelName];
  return lvl !== undefined && lvl <= currentLevel;
}

export function logError(...args) {
  if (shouldLog('error')) console.error(...args);
}
export function logWarn(...args) {
  if (shouldLog('warn')) console.warn(...args);
}
export function logInfo(...args) {
  if (shouldLog('info')) console.log(...args);
}
export function logDebug(...args) {
  if (shouldLog('debug')) console.log(...args);
}
export function logTrace(...args) {
  if (shouldLog('trace')) console.log(...args);
}

// Helper to silence a verbose section temporarily
export function withTempLogLevel(level, fn) {
  const prev = currentLevelName;
  setLogLevel(level);
  try { return fn(); } finally { setLogLevel(prev); }
}

// Allow dynamic override at runtime (e.g. globalThis.setWTLogLevel('debug'))
if (typeof globalThis !== 'undefined') {
  globalThis.setWTLogLevel = setLogLevel;
}
