// april-comparison.js
// Script standalone: legge un backup JSON WorkT e crea una tabella CSV
// Confronta per ogni giorno di un mese: netto calcolato sul lordo reale (dashboard)
// vs netto calcolato sulla retribuzione giornaliera contrattuale (riepilogo)

const fs = require('fs');
const path = require('path');

// Default backup filename (modifica se necessario)
const DEFAULT_BACKUP = 'WorkT-auto-backup-2026-05-21_20-01-36.json';

// Parametri CLI: [backupPath] [year] [month]
const args = process.argv.slice(2);
const backupPath = args[0] || path.join(process.cwd(), DEFAULT_BACKUP);
const year = Number(args[1] || 2026);
const month = Number(args[2] || 4); // 4 = aprile

// Costanti semplificate riprese dai sorgenti dell'app
const TAX_DEDUCTIONS = {
  INPS_EMPLOYEE: { rate: 0.0919, maxAnnualBase: 118000 },
  IRPEF: { brackets: [ { min: 0, max: 28000, rate: 0.23 }, { min: 28000, max: 50000, rate: 0.35 }, { min: 50000, max: Infinity, rate: 0.43 } ] },
  REGIONAL_TAX: { rate: 0.0173 },
  MUNICIPAL_TAX: { rate: 0.008, maxAmount: 800 },
  DEDUCTIONS: { workEmployee: { maxAmount: 1880, threshold: 15000 }, personalDeduction: 1990 }
};

const PAYROLL_CALCULATIONS = {
  QUICK_NET_RATES: { LOW_INCOME: 0.85, MEDIUM_INCOME: 0.75, HIGH_INCOME: 0.65 },
  INCOME_THRESHOLDS: { LOW: 25000, MEDIUM: 40000 },
  TYPICAL_WORKDAYS_YEAR: 312
};

const DEFAULT_CONTRACT = { monthlySalary: 2173.77, dailyRate: 83.61, hourlyRate: 12.57 };

function safeParseJson(value) {
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch (e) { return null; }
}

// Debug logging helper (scrive in apri-debug.log)
const DEBUG_LOG = path.join(process.cwd(), 'april-debug.log');
function debug(msg) {
  try {
    fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - ${msg}\n`);
  } catch (e) {
    // ignore
  }
}

// Inizia file di debug (sovrascrive)
try { fs.writeFileSync(DEBUG_LOG, `--- april-comparison debug start: ${new Date().toISOString()} ---\n`); } catch (e) {}
debug('script started');
debug(`cwd=${process.cwd()}`);
debug(`backup default: ${DEFAULT_BACKUP}`);

function findWorkEntries(obj) {
  if (!obj) return null;
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object' && ('date' in obj[0] || 'total_earnings' in obj[0] || 'totalEarnings' in obj[0])) return obj;
    for (const v of obj) {
      const r = findWorkEntries(v);
      if (r) return r;
    }
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const r = findWorkEntries(obj[key]);
      if (r) return r;
    }
  }
  return null;
}

function findSettings(obj) {
  if (!obj) return null;
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object' && ('key' in obj[0] && 'value' in obj[0])) return obj;
    for (const v of obj) {
      const r = findSettings(v);
      if (r) return r;
    }
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const r = findSettings(obj[key]);
      if (r) return r;
    }
  }
  return null;
}

// Net calculator (estratti e semplificati dal codice dell'app)
function calculateQuickNet(grossAmount) {
  try {
    const estimatedAnnual = grossAmount * PAYROLL_CALCULATIONS.TYPICAL_WORKDAYS_YEAR / 26;
    let netRate;
    if (estimatedAnnual <= PAYROLL_CALCULATIONS.INCOME_THRESHOLDS.LOW) netRate = PAYROLL_CALCULATIONS.QUICK_NET_RATES.LOW_INCOME;
    else if (estimatedAnnual <= PAYROLL_CALCULATIONS.INCOME_THRESHOLDS.MEDIUM) netRate = PAYROLL_CALCULATIONS.QUICK_NET_RATES.MEDIUM_INCOME;
    else netRate = PAYROLL_CALCULATIONS.QUICK_NET_RATES.HIGH_INCOME;
    const netAmount = grossAmount * netRate;
    const totalDeductions = grossAmount - netAmount;
    return { gross: grossAmount, net: netAmount, totalDeductions, deductionRate: 1 - netRate };
  } catch (e) {
    return { gross: grossAmount, net: grossAmount * 0.75, totalDeductions: grossAmount * 0.25, deductionRate: 0.25 };
  }
}

function _calculateINPS(grossAmount) {
  const maxMonthlyBase = TAX_DEDUCTIONS.INPS_EMPLOYEE.maxAnnualBase / 12;
  const contributionBase = Math.min(grossAmount, maxMonthlyBase);
  return contributionBase * TAX_DEDUCTIONS.INPS_EMPLOYEE.rate;
}

function _calculateIRPEF(taxableAmount) {
  let totalIrpef = 0;
  let remaining = taxableAmount;
  for (const bracket of TAX_DEDUCTIONS.IRPEF.brackets) {
    if (remaining <= 0) break;
    const bracketRange = Math.min(bracket.max - bracket.min, remaining);
    const bracketAmount = Math.max(0, bracketRange);
    totalIrpef += bracketAmount * bracket.rate;
    remaining -= bracketAmount;
  }
  return totalIrpef;
}

function _calculateDeductions(grossAmount) {
  const workDeduction = Math.min(
    TAX_DEDUCTIONS.DEDUCTIONS.workEmployee.maxAmount / 12,
    (TAX_DEDUCTIONS.DEDUCTIONS.workEmployee.maxAmount * Math.max(0, TAX_DEDUCTIONS.DEDUCTIONS.workEmployee.threshold - grossAmount * 12) / TAX_DEDUCTIONS.DEDUCTIONS.workEmployee.threshold) / 12
  );
  const personalDeduction = TAX_DEDUCTIONS.DEDUCTIONS.personalDeduction / 12;
  return workDeduction + personalDeduction;
}

function calculateDetailedNet(grossAmount, options = {}) {
  try {
    const regionalTaxRate = options.regionalTaxRate ?? TAX_DEDUCTIONS.REGIONAL_TAX.rate;
    const municipalTaxRate = options.municipalTaxRate ?? TAX_DEDUCTIONS.MUNICIPAL_TAX.rate;
    const inps = _calculateINPS(grossAmount);
    const taxableBase = grossAmount - inps;
    const irpef = _calculateIRPEF(taxableBase);
    const regionalTax = taxableBase * regionalTaxRate;
    const municipalTax = Math.min(taxableBase * municipalTaxRate, TAX_DEDUCTIONS.MUNICIPAL_TAX.maxAmount / 12);
    const deductions = options.includeDeductions === false ? 0 : _calculateDeductions(grossAmount);
    const totalTaxes = irpef + regionalTax + municipalTax - deductions;
    const totalDeductions = inps + Math.max(totalTaxes, 0);
    const netAmount = grossAmount - totalDeductions;
    return { gross: grossAmount, net: netAmount, totalDeductions, breakdown: { inpsContribution: inps, irpef, regionalTax, municipalTax, deductions, totalTaxes: Math.max(totalTaxes, 0) } };
  } catch (e) {
    return calculateQuickNet(grossAmount);
  }
}

function formatNumber(n) { return Number.isFinite(n) ? n.toFixed(2) : '0.00'; }

// Leggi backup
debug(`checking backupPath exists: ${backupPath}`);
if (!fs.existsSync(backupPath)) {
  debug('backup not found');
  console.error('Backup non trovato:', backupPath);
  const files = fs.readdirSync(process.cwd()).filter(f => f.toLowerCase().startsWith('workt-auto-backup') || f.toLowerCase().startsWith('workt-'));
  if (files.length) console.log('Backup trovati nella cartella corrente:', files.join(', '));
  process.exit(1);
}

let raw;
try {
  debug('attempting fs.statSync on backup');
  const st = fs.statSync(backupPath);
  debug(`stat size=${st.size}, isFile=${st.isFile()}`);
} catch (e) {
  debug(`statSync error: ${e && e.message}`);
}

try {
  debug('attempting to read backup file (first 1MB)');
  raw = fs.readFileSync(backupPath, 'utf8');
  debug(`read raw length: ${raw ? raw.length : 0}`);
  debug(`raw snippet: ${raw ? raw.slice(0,500).replace(/\n/g,' ') : ''}`);
} catch (e) {
  debug(`readFileSync error: ${e && e.message}`);
  console.error('Impossibile leggere il backup:', e.message);
  process.exit(1);
}

let backup;
try { backup = JSON.parse(raw); debug('backup parsed as JSON'); } catch (e) { debug(`JSON.parse error: ${e && e.message}`); console.error('Backup JSON non valido:', e.message); process.exit(1); }

const workEntries = findWorkEntries(backup) || [];
const settingsArr = findSettings(backup) || [];

// Estrai appSettings (se presente)
let appSettings = null;
if (Array.isArray(settingsArr)) {
  const app = settingsArr.find(s => s.key === 'appSettings' || s.key === 'appsettings' || s.key === 'AppSettings');
  if (app) appSettings = safeParseJson(app.value) || safeParseJson(app.value?.toString());
}

const contractDaily = (appSettings && (appSettings.contract?.dailyRate || appSettings.contract?.daily_rate)) || DEFAULT_CONTRACT.dailyRate;
const useActualAmountFlag = appSettings?.netCalculation?.useActualAmount ?? undefined;

// Costruisci mappa date -> entry
const entryByDate = new Map();
for (const e of workEntries) {
  const date = e.date || e.date_str || e.data || e.day;
  if (!date) continue;
  entryByDate.set(date.slice(0,10), e);
}

const monthIndex = month - 1;
const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

const rows = [];
let totals = { grossActual: 0, netActual: 0, netContract: 0 };

for (let d = 1; d <= daysInMonth; d++) {
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const entry = entryByDate.get(dateStr);
  const grossActual = entry ? (Number(entry.totalEarnings ?? entry.total_earnings ?? entry.total ?? entry.fixedEarnings ?? entry.fixed_earnings ?? 0)) : 0;
  const netActual = calculateDetailedNet(grossActual).net;
  // Netto calcolato sulla retribuzione giornaliera contrattuale
  const netContract = calculateDetailedNet(contractDaily).net;

  totals.grossActual += grossActual;
  totals.netActual += netActual;
  totals.netContract += netContract;

  rows.push({ date: dateStr, grossActual: formatNumber(grossActual), netActual: formatNumber(netActual), netContract: formatNumber(netContract), diff: formatNumber(netContract - netActual) });
}

// Scrivi CSV
const outFile = path.join(process.cwd(), `april-comparison-${year}-${String(month).padStart(2,'0')}.csv`);
const header = ['date','grossActual','netActual','netContract','difference'];
const csv = [header.join(',')].concat(rows.map(r => `${r.date},${r.grossActual},${r.netActual},${r.netContract},${r.diff}`)).join('\n');
fs.writeFileSync(outFile, csv, 'utf8');

console.log(`Tabella generata: ${outFile}`);
console.log('Riepilogo:');
console.log(`  Totale Lordo (entries): €${formatNumber(totals.grossActual)}`);
console.log(`  Totale Netto (calcolo su lordo reale): €${formatNumber(totals.netActual)}`);
console.log(`  Totale Netto (calcolo su retribuzione contrattuale giornaliera €${contractDaily}): €${formatNumber(totals.netContract)}`);
if (useActualAmountFlag !== undefined) console.log(`Impostazione appSettings.netCalculation.useActualAmount = ${useActualAmountFlag}`);

console.log('\nEsempio righe (prime 10):');
console.table(rows.slice(0,10));

console.log('\nSe vuoi, esegui: node april-comparison.js <percorso_backup.json> <anno> <mese>');

