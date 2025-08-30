// Central log filtering & compression without refactoring all modules.
// Import this FIRST in App.js.
// Runtime: setAppLogLevel('info'|'debug'|'warn'|'error'|'silent')

const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5 };
let currentLevelName = (typeof process !== 'undefined' && process.env && (process.env.EXPO_PUBLIC_LOG_LEVEL || process.env.LOG_LEVEL)) || 'info';
let currentLevel = LEVELS[currentLevelName] ?? LEVELS.info;

const PATTERN_LEVELS = [
  { re: /TimeCalculator/i, level: 'debug' },
  { re: /CalculationService.*(DEBUG|FINAL RETURN|Risultato|Straordinari)/i, level: 'debug' },
  { re: /🔧 DEBUG/i, level: 'debug' },
  { re: /🔧 DASHBOARD DEBUG/i, level: 'debug' },
  { re: /🔧 DAILY DEBUG/i, level: 'debug' },
  { re: /FixedDaysService/i, level: 'debug' },
  { re: /📞 \[DEBUG]/i, level: 'debug' },
  { re: /calculateStandbyBreakdown - Processing/i, level: 'debug' },
  { re: /Total segments extracted/i, level: 'debug' },
  { re: /Final (minute|hour) breakdown/i, level: 'debug' },
  { re: /Notifica nel passato saltata/i, level: 'debug' },
  { re: /Notifica troppo lontana saltata/i, level: 'debug' },
  { re: /DAILY_RATE_WITH_SUPPLEMENTS/i, level: 'debug' },
  { re: /🚀 FINAL RETURN/i, level: 'debug' },
  { re: /📊 DEBUG extract/i, level: 'debug' },
  { re: /DEBUG OVERTIME/i, level: 'debug' },
  { re: /DEBUG TRASFERTA/i, level: 'debug' },
  { re: /DEBUG PASTI/i, level: 'debug' },
  { re: /DEBUG STRAORDINARI/i, level: 'debug' },
  { re: /DEBUG AGGREGATED ANALYTICS/i, level: 'debug' },
  { re: /DEBUG PATTERN/i, level: 'debug' },
  { re: /DASHBOARD MONITOR/i, level: 'debug' },
  { re: /calculateMonthlyAggregation/i, level: 'debug' },
  { re: /Riprogrammati .* promemoria/i, level: 'debug' },
  { re: /Sistema backup completo inizializzato/i, level: 'info' },
];

function levelAllowed(required) { return currentLevel >= LEVELS[required]; }

let lastMsg = null; let repeatCount = 0; let lastTimer = null;
const originalConsole = { ...console };

function flushRepeat() {
  if (repeatCount > 1 && lastMsg) {
    if (levelAllowed('info')) originalConsole.log(`↺ (ripetuto x${repeatCount - 1})`, lastMsg);
  }
  repeatCount = 0; lastMsg = null; if (lastTimer) { clearTimeout(lastTimer); lastTimer = null; }
}

function shouldSuppress(args, method) {
  if (!args || !args.length) return false;
  if (currentLevel === LEVELS.silent && method !== 'error') return true;
  const first = typeof args[0] === 'string' ? args[0] : '';
  for (const { re, level } of PATTERN_LEVELS) {
    if (re.test(first)) return !levelAllowed(level);
  }
  return false;
}

['log','info','debug'].forEach(method => {
  console[method] = (...args) => {
    if (shouldSuppress(args, method)) return;
    const key = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (key === lastMsg) { repeatCount++; if (!lastTimer) lastTimer = setTimeout(flushRepeat, 1500); return; }
    flushRepeat(); originalConsole[method](...args);
  };
});
['warn','error'].forEach(method => {
  console[method] = (...args) => { flushRepeat(); originalConsole[method](...args); };
});

function setAppLogLevel(level) {
  if (LEVELS[level] === undefined) { originalConsole.warn('Log level non valido:', level); return; }
  currentLevelName = level; currentLevel = LEVELS[level]; flushRepeat(); originalConsole.log('🔧 Log level aggiornato a', level);
}
if (typeof globalThis !== 'undefined') { globalThis.setAppLogLevel = setAppLogLevel; globalThis.getAppLogLevel = () => currentLevelName; }

export { setAppLogLevel };
