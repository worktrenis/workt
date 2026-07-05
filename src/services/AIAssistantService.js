/**
 * 🧠 Assistente Integrato WorkT - Knowledge Base CCNL & App (ENHANCED V2)
 * 
 * Risponde su TUTTE le funzionalità REALI dell'app:
 * - CCNL Metalmeccanico PMI (maggiorazioni, tariffe, indennità) — valori REALI dal contratto
 * - Utilizzo dell'app (schermate, funzionalità)
 * - Calcoli e statistiche personali (lettura dati reali dal DB e dalle impostazioni)
 * - STATO ATTUALE di ogni impostazione + opzioni di modifica
 * 
 * NO tredicesima, NO 14esima, NO netto/IRPEF reale — non sono calcolati dall'app.
 * L'app calcola una stima lorda + una trattenuta configurabile dall'utente.
 * 
 * Gratuito, offline, senza API key.
 * 
 * ⚠️ IMPORTANTE: I valori di default indicati (L5) sono quelli iniziali.
 *    L'assistente LEGGE le impostazioni REALI dell'utente da AsyncStorage
 *    e restituisce i valori effettivamente configurati e calcolati.
 */

import { 
  CCNL_CONTRACTS, 
  getStandbyRatesForContract,
  CCNL_STANDBY_RATES,
  getWorkDayHours,
  DEFAULT_SETTINGS
} from '../constants';
import DatabaseService from './DatabaseService';
import CalculationService from './CalculationService';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import AICalculationHelper from './AICalculationHelper';

const DEFAULT_CONTRACT = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;

// ============================================================
// CATEGORIE con parole chiave SINGOLE e multi-word
// Il sistema matcha sia parole singole che frasi complete
// ============================================================
const CATEGORIES = [
  {
    id: 'STRAORDINARIO_DIURNO',
    label: 'straordinario diurno',
    words: ['straordinario', 'straordinarî', 'extra', 'oltre', 'eccedenza'],
    phrases: ['straordinario diurno', 'straordinario giorno', 'straordinario 20', 'oltre 8 ore', 'maggiorazione 20%', 'ore extra', '20% giorno'],
    weight: 1.0,
  },
  {
    id: 'STRAORDINARIO_SERALE',
    label: 'straordinario serale',
    words: ['straordinario', 'serale', 'sera', '20-22', '20:00'],
    phrases: ['straordinario serale', 'fascia serale', 'serale +25%', 'ore serali'],
    weight: 1.0,
  },
  {
    id: 'STRAORDINARIO_NOTTURNO',
    label: 'straordinario notturno',
    words: ['straordinario', 'notturno', 'notte', '45%', '50%', 'dopo 22'],
    phrases: ['straordinario notturno', 'notturno straordinario', 'notturno 45%', 'notturno 50%', 'straordinario dopo 22'],
    weight: 1.0,
  },
  {
    id: 'STRAORDINARIO_FESTIVO',
    label: 'straordinario festivo',
    words: ['straordinario', 'festivo', 'domenica', 'festività'],
    phrases: ['straordinario festivo', 'festivo straordinario', 'domenica straordinario', 'festivo 50%', 'domenica +50%'],
    weight: 1.0,
  },
  {
    id: 'TARIFFA_ORARIA',
    label: 'tariffa oraria',
    words: ['oraria', 'orario', 'ora', '€/h', "all'ora", 'paga oraria'],
    phrases: ['tariffa oraria', 'quanto prendo all\'ora', 'compenso orario', 'retribuzione oraria', 'paga oraria'],
    weight: 0.9,
  },
  {
    id: 'TARIFFA_GIORNALIERA',
    label: 'tariffa giornaliera',
    words: ['giornaliera', 'giorno', 'diaria', '€/giorno'],
    phrases: ['tariffa giornaliera', 'quanto prendo al giorno', 'paga giornaliera', 'compenso giornaliero'],
    weight: 0.9,
  },
  {
    id: 'STIPENDIO',
    label: 'stipendio',
    words: ['stipendio', 'mensile', 'paga', 'retribuzione', 'compenso', 'lordo'],
    phrases: ['quanto prendo', 'paga base', 'retribuzione mensile', 'paga mensile', 'compenso mensile'],
    weight: 0.8,
  },
  {
    id: 'CONTRATTO',
    label: 'contratto CCNL',
    words: ['contratto', 'livello', 'ccnl', 'metalmeccanico', 'pmi', 'inquadramento', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9'],
    phrases: ['livello 5', 'livello 4', 'livello 3', 'livello 2', 'livello 1', 'livello 6', 'livello 7', 'livello 8', 'livello 9'],
    weight: 0.8,
  },
  {
    id: 'REPERIBILITA',
    label: 'reperibilità',
    words: ['reperibilità', 'reperibile', 'standby', 'disponibilità', 'pronta'],
    phrases: ['indennità reperibilità', 'pronta reperibilità', 'reperibilità feriale', 'reperibilità festiva'],
    weight: 1.0,
  },
  {
    id: 'INTERVENTO_REPERIBILITA',
    label: 'intervento in reperibilità',
    words: ['intervento', 'chiamata', 'uscita'],
    phrases: ['intervento reperibilità', 'chiamata reperibilità', 'uscita reperibilità', 'intervento standby', 'chiamata standby'],
    weight: 1.0,
  },
  {
    id: 'VIAGGIO',
    label: 'ore di viaggio',
    words: ['viaggio', 'trasferta', 'cantiere', 'cantieri', 'spostamento', 'multi turno', 'multiturno', 'multi-turno'],
    phrases: ['ore viaggio', 'compenso viaggio', 'rimborso viaggio', 'tempo viaggio', 'ore di viaggio', 'viaggio lavoro', 'viaggio cantiere', 'viaggio tra cantieri', 'impostazioni viaggio', 'modalità viaggio', 'più cantieri', 'diversi cantieri', 'turni multipli', 'da un cantiere', 'cantiere a cantiere', 'come funziona il viaggio'],
    weight: 1.0,
  },
  {
    id: 'INDENNITA_TRASFERTA',
    label: 'indennità trasferta',
    words: ['trasferta', 'diaria', 'rimborso spese'],
    phrases: ['indennità trasferta', 'rimborso trasferta', 'diaria trasferta', 'indennità viaggio', 'rimborso spese viaggio', 'indennità giornaliera trasferta', 'impostazioni trasferta'],
    weight: 0.9,
  },
  {
    id: 'PASTI',
    label: 'rimborsi pasti',
    words: ['pasto', 'pasti', 'pranzo', 'cena', 'buono', 'voucher', 'rimborso'],
    phrases: ['buono pasto', 'rimborso pasto', 'buono pranzo', 'buono cena', 'pasto lavoro', 'rimborso pranzo', 'rimborso cena', 'impostazioni pasti', 'rimborsi pasti'],
    weight: 0.9,
  },
  {
    id: 'FERIE',
    label: 'ferie',
    words: ['ferie', 'ferie'],
    phrases: ['giorni ferie', 'quante ferie', 'ferie residue', 'ferie rimanenti', 'calcolo ferie', 'ferie anno'],
    weight: 0.8,
  },
  {
    id: 'PERMESSI',
    label: 'permessi',
    words: ['permesso', 'permessi'],
    phrases: ['ore permesso', 'permessi residui', 'permessi rimanenti', 'ore permesso anno', 'permessi retribuiti'],
    weight: 0.8,
  },
  {
    id: 'ROL',
    label: 'ROL',
    words: ['rol', 'ex festività', 'banca ore'],
    phrases: ['riduzione orario lavoro', 'ore banca ore', 'ore accumulate', 'rol residui', 'ex festività residue'],
    weight: 1.0,
  },
  {
    id: 'MALATTIA',
    label: 'malattia',
    words: ['malattia', 'malato', 'assenza', 'malato', 'inps'],
    phrases: ['giorni malattia', 'malattia ccnl', 'assenza per malattia', 'malattia lavoro', 'certificato medico'],
    weight: 0.8,
  },
  {
    id: 'MIEI_DATI',
    label: 'i tuoi dati',
    words: ['miei dati', 'statistiche', 'guadagnato', 'guadagni', 'ore lavorate', 'lavorato'],
    phrases: ['mie ore', 'miei guadagni', 'quanto ho guadagnato', 'mie statistiche', 'mie ore lavoro', 'mie ore mese', 'quanto ho lavorato', 'le mie ore', 'i miei dati'],
    weight: 0.9,
  },
  {
    id: 'RIEPILOGO_MENSILE',
    label: 'riepilogo mensile',
    words: ['riepilogo', 'bilancio', 'totale', 'mese'],
    phrases: ['ultimo mese', 'mese scorso', 'riepilogo mensile', 'riepilogo mese', 'bilancio mensile', 'riepilogo ore mese', 'guadagni mese', 'totali mese'],
    weight: 0.9,
  },
  {
    id: 'FESTIVITA',
    label: 'festività',
    words: ['festivo', 'festività', 'calendario', 'nazionale'],
    phrases: ['giorno festivo', 'festivo nazionale', 'quando è festa', 'festività italiane', 'giorni festivi anno', 'calendario festività'],
    weight: 0.8,
  },
  {
    id: 'GUIDA',
    label: 'guida',
    words: ['guida', 'aiuto', 'tutorial', 'manuale', 'istruzioni', 'iniziare', 'funziona'],
    phrases: ['come si usa', 'come funziona', 'non capisco', 'guida rapida', 'come iniziare'],
    weight: 0.7,
  },
  {
    id: 'INSERIMENTO_ORARIO',
    label: 'inserimento orario',
    words: ['inserire', 'registrare', 'aggiungere', 'segna', 'registra'],
    phrases: ['inserire orario', 'registrare ore', 'aggiungere turno', 'come inserisco', 'inserimento orario', 'aggiungere ore', 'segna ore', 'registra lavoro', 'come segnare ore'],
    weight: 0.9,
  },
  {
    id: 'BACKUP',
    label: 'backup',
    words: ['backup', 'salvare', 'esportare', 'ripristinare', 'salva', 'copia'],
    phrases: ['salvare dati', 'perdo dati', 'backup dati', 'esporta dati', 'copia sicurezza', 'ripristino backup', 'salva dati'],
    weight: 0.9,
  },
  {
    id: 'NOTIFICHE',
    label: 'notifiche',
    words: ['notifica', 'notifiche', 'promemoria', 'ricordo', 'avviso', 'alert'],
    phrases: ['notifiche lavoro', 'notifiche app', 'promemoria orario', 'notifica promemoria', 'impostazioni notifiche', 'gestione notifiche'],
    weight: 0.8,
  },
  {
    id: 'TEMA',
    label: 'tema',
    words: ['tema', 'scuro', 'chiaro', 'dark', 'light', 'aspetto', 'colori'],
    phrases: ['dark mode', 'light mode', 'tema scuro', 'tema chiaro', 'modalità notturna', 'tema app'],
    weight: 0.8,
  },
  {
    id: 'LAVORO_NOTTURNO',
    label: 'lavoro notturno',
    words: ['notturno', 'notte', '25%'],
    phrases: ['lavoro notturno', 'notturno ordinario', 'notte ordinario', 'lavoro di notte', 'turno notturno', 'notturno 25%', 'maggiorazione notturna ordinaria'],
    weight: 1.0,
  },
  {
    id: 'LAVORO_FESTIVO',
    label: 'lavoro festivo',
    words: ['festivo', 'domenica', '30%'],
    phrases: ['lavoro festivo', 'festivo ordinario', 'domenica ordinario', 'lavoro domenica', 'festivo 30%', 'maggiorazione festiva ordinaria', 'domenica +30%'],
    weight: 1.0,
  },
  {
    id: 'IMPOSTAZIONI_CCNL',
    label: 'impostazioni contratto',
    words: ['contratto', 'cambiare', 'cambio', 'modificare', 'scegliere', 'impostare'],
    phrases: ['impostazioni contratto', 'impostazioni ccnl', 'cambiare contratto', 'cambiare livello', 'scegliere contratto', 'cambio contratto'],
    weight: 1.0,
  },
  {
    id: 'METODO_CALCOLO',
    label: 'metodo di calcolo',
    words: ['metodo', 'calcolo'],
    phrases: ['metodo calcolo', 'calcolo ccnl', 'tariffa oraria pura', 'calcolo orario puro', 'metodo di calcolo', 'impostazioni calcolo', 'calcolo misto', 'calcolo retribuzione', 'metodo retribuzione', 'calcolo personalizzato'],
    weight: 1.0,
  },
  {
    id: 'FASCE_ORARIE',
    label: 'fasce orarie',
    words: ['fasce', 'maggiorazioni', 'personalizzate'],
    phrases: ['fasce orarie', 'maggiorazioni personalizzate', 'fasce orarie personalizzate', 'orari maggiorazione', 'fasce orarie calcolo', 'impostazioni fasce', 'fasce orarie avanzate', 'maggiorazioni fasce'],
    weight: 1.0,
  },
  {
    id: 'CALCOLO_NETTO',
    label: 'calcolo netto / trattenute',
    words: ['netto', 'trattenute', 'trattenuta', 'fiscale', 'fiscali', 'irpef', 'inps', 'tasse', 'tassa', 'contributi', 'aliquota', 'detrazioni', 'detrazione', 'lorda', 'percentuale'],
    phrases: ['calcolo netto', 'trattenute fiscali', 'calcolo trattenute', 'le mie trattenute', 'come sono le trattenute', 'trattenute inps', 'trattenute irpef', 'quanto mi trattengono', 'cosa mi trattengono', 'detrazioni fiscali', 'netto impostazioni', 'impostazioni netto', 'percentuale trattenute', 'configurare netto', 'stipendio netto', 'quanto prendo netto'],
    weight: 1.0,
  },
  {
    id: 'IMPOSTAZIONI_GENERALI',
    label: 'impostazioni generali',
    words: ['impostazioni', 'impostazione', 'configurare', 'opzioni', 'opzione'],
    phrases: ['impostazioni app', 'menù impostazioni', 'schermata impostazioni', 'cosa posso impostare', 'come configurare'],
    weight: 0.7,
  },
];

// ============================================================
// Parole "stop" comuni che non dovrebbero influenzare il matching
// ============================================================
const STOP_WORDS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'del', 'dello', 'della', 'dei', 'degli', 'delle',
  'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',
  'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'che', 'chi', 'cui', 'cosa', 'come', 'quando', 'dove', 'perché', 'quanto', 'quale',
  'e', 'ed', 'o', 'ma', 'se', 'anche', 'non', 'mi', 'ti', 'si', 'ci', 'vi', 'lo', 'la',
  'sono', 'hai', 'ha', 'ho', 'hanno', 'sia', 'essere', 'stato',
  'più', 'meno', 'molto', 'tanto', 'solo', 'già', 'poi', 'dopo', 'prima', 'sempre', 'mai',
  'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle',
  'mio', 'mia', 'miei', 'mie', 'tuo', 'tua', 'tuoi', 'tue', 'suo', 'sua', 'suoi', 'sue',
  'nostro', 'nostra', 'nostri', 'nostre', 'vostro', 'vostra', 'vostri', 'vostre',
  'ciao', 'buongiorno', 'buonasera', 'salve', 'grazie', 'prego',
  'posso', 'puoi', 'può', 'possiamo', 'potete', 'possono', 'voglio', 'vorrei',
  'fare', 'fai', 'faccio', 'fanno', 'fate', 'faccia',
  'sapere', 'saper', 'sai', 'chiedere', 'chiedo', 'chiederti', 'domanda',
  'rispondere', 'rispondi', 'risposta', 'aiutare', 'aiutami', 'aiuto',
]);

class AIAssistantService {
  constructor() {
    this.calculationService = new CalculationService();
    this.calcHelper = new AICalculationHelper(this.calculationService);
    this._contextCache = null;
    this._contextCacheTime = 0;
    this.CACHE_TTL = 5000;
  }

  _fmt(value) {
    return `€${Number(value).toFixed(2)}`;
  }

  _fmtHours(value) {
    return `${Number(value).toFixed(1)}h`;
  }

  _getContract(settings) {
    return settings?.contract || DEFAULT_CONTRACT;
  }

  _getHourlyRate(settings) {
    const contract = this._getContract(settings);
    return contract.hourlyRate || (contract.monthlySalary / 173) || 12.57;
  }

  _getDailyRate(settings) {
    const contract = this._getContract(settings);
    return contract.dailyRate || (contract.monthlySalary / (contract.workingDaysPerMonth || 26)) || 83.61;
  }

  _getMonthlySalary(settings) {
    const contract = this._getContract(settings);
    return contract.monthlySalary || 2173.77;
  }

  _getContractName(settings) {
    return this._getContract(settings).name || 'CCNL Metalmeccanico PMI - Livello 5';
  }

  _getContractLevel(settings) {
    const contract = this._getContract(settings);
    const match = contract.key ? contract.key.match(/_L(\d)$/) : null;
    return match ? parseInt(match[1], 10) : 5;
  }

  _getStandbyRates(settings) {
    const contractKey = this._getContract(settings).key;
    return getStandbyRatesForContract(contractKey);
  }

  /**
   * Calcola ore totali usando createWorkEntryFromData per
   * essere consistenti con Dashboard e TimeEntryForm
   */
  _calculateTotalHours(workEntries) {
    return this.calcHelper.calculateTotalHours(workEntries);
  }

  /**
   * Estrae le parole significative dalla domanda (rimuove stop words)
   */
  _extractSignificantWords(question) {
    // Normalizza: togli punteggiatura, spazi multipli
    const cleaned = question
      .replace(/[?.,!;:()\[\]{}"'«»]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = cleaned.split(' ').filter(w => w.length > 1);
    
    // Filtra stop words, normalizza al singolare/base
    return words.filter(w => !STOP_WORDS.has(w)).map(w => {
      // Stemming base italiano: toglie desinenze plurali e femminili
      let stem = w.toLowerCase();
      if (stem.endsWith('zioni')) stem = stem.slice(0, -4) + 'zione';
      else if (stem.endsWith('zioni')) stem = stem.slice(0, -4);
      else if (stem.endsWith('ndo')) stem = stem.slice(0, -3);
      else if (stem.endsWith('rsi')) stem = stem.slice(0, -3);
      return stem;
    });
  }

  /**
   * Sistema di scoring avanzato: matcha sia parole singole che frasi,
   * e calcola un punteggio ponderato.
   */
  _scoreQuestion(q) {
    const significantWords = this._extractSignificantWords(q);
    const scores = [];
    
    for (const category of CATEGORIES) {
      let wordScore = 0;
      let phraseScore = 0;
      let matchedWords = [];
      let matchedPhrases = [];

      // Match frasi complete (più peso)
      for (const phrase of category.phrases) {
        if (q.includes(phrase)) {
          const score = phrase.length * category.weight;
          phraseScore += score;
          matchedPhrases.push(phrase);
        }
      }

      // Match parole singole
      for (const word of category.words) {
        if (q.includes(word)) {
          const score = (word.length > 4 ? word.length * 0.5 : 2) * category.weight;
          wordScore += score;
          matchedWords.push(word);
        }
        // Match anche nelle parole significative estratte (stemming)
        for (const sw of significantWords) {
          if (sw.includes(word) || word.includes(sw)) {
            if (!q.includes(word)) {
              const score = 1.5 * category.weight;
              wordScore += score;
              matchedWords.push(`${sw}~${word}`);
            }
          }
        }
      }

      const totalScore = (phraseScore * 1.5) + wordScore;

      if (totalScore > 0) {
        scores.push({
          category: category.id,
          label: category.label,
          score: totalScore,
          matchedWords: matchedWords.length,
          matchedPhrases: matchedPhrases.length,
          wordScore,
          phraseScore,
        });
      }
    }

    // Se non c'è nessun match, restituisci null
    if (scores.length === 0) return null;

    // Ordina per punteggio decrescente
    scores.sort((a, b) => b.score - a.score);

    // Penalità per overlap: se ci sono troppe categorie matchate,
    // c'è ambiguità, riduci il punteggio
    if (scores.length > 3) {
      scores.forEach(s => {
        s.score *= 0.75;
      });
      scores.sort((a, b) => b.score - a.score);
    }

    // Prendi il best match
    const best = scores[0];
    
    // Soglia minima: se il punteggio è troppo basso, non matcha
    if (best.score < 1.5) return null;

    return {
      category: best.category,
      score: best.score,
      allScores: scores,
    };
  }

  async ask(question, context = {}) {
    const q = question.toLowerCase().trim();
    const result = this._scoreQuestion(q);

    if (!result) {
      // Non ha capito → risposta di fallback intelligente
      return {
        text: this._answerFallback(question),
        suggestions: this._getSuggestions([])
      };
    }

    const answer = await this._generateAnswer(result.category, context);
    const suggestions = this._getSuggestions([result.category]);

    return { text: answer, suggestions };
  }

  async _generateAnswer(category, context) {
    switch (category) {
      case 'STRAORDINARIO_DIURNO': return this._answerOvertimeDay(context.settings);
      case 'STRAORDINARIO_SERALE': return this._answerOvertimeEvening(context.settings);
      case 'STRAORDINARIO_NOTTURNO': return this._answerOvertimeNight(context.settings);
      case 'STRAORDINARIO_FESTIVO': return this._answerOvertimeHoliday(context.settings);
      case 'TARIFFA_ORARIA': return this._answerHourlyRate(context.settings);
      case 'TARIFFA_GIORNALIERA': return this._answerDailyRate(context.settings);
      case 'STIPENDIO': return this._answerSalary(context.settings);
      case 'CONTRATTO': return this._answerContract(context.settings);
      case 'REPERIBILITA': return this._answerStandby(context.settings);
      case 'INTERVENTO_REPERIBILITA': return this._answerStandbyIntervention(context.settings);
      case 'VIAGGIO': return this._answerTravel(context.settings);
      case 'INDENNITA_TRASFERTA': return this._answerTravelAllowance(context.settings);
      case 'PASTI': return this._answerMeals(context.settings);
      case 'FERIE': return this._answerVacation();
      case 'PERMESSI': return this._answerPermits();
      case 'ROL': return this._answerROL();
      case 'MALATTIA': return this._answerSickLeave();
      case 'MIEI_DATI': return await this._answerMyStats(context);
      case 'RIEPILOGO_MENSILE': return await this._answerMonthlySummary(context);
      case 'FESTIVITA': return this._answerHolidays();
      case 'GUIDA': return this._answerGuide();
      case 'INSERIMENTO_ORARIO': return this._answerHowToEntry();
      case 'BACKUP': return this._answerBackup();
      case 'NOTIFICHE': return this._answerNotifications();
      case 'TEMA': return this._answerTheme();
      case 'LAVORO_NOTTURNO': return this._answerLavoroNotturno(context.settings);
      case 'LAVORO_FESTIVO': return this._answerLavoroFestivo(context.settings);
      case 'IMPOSTAZIONI_CCNL': return this._answerImpostazioniContratto(context.settings);
      case 'METODO_CALCOLO': return this._answerMetodoCalcolo(context.settings);
      case 'FASCE_ORARIE': return this._answerFasceOrarie(context.settings);
      case 'CALCOLO_NETTO': return this._answerCalcoloNetto(context.settings);
      case 'IMPOSTAZIONI_GENERALI': return this._answerImpostazioniGenerali(context.settings);
      default: return this._answerFallback(context.query || '');
    }
  }

  /**
   * 🔄 Carica il contesto con TUTTI i dati necessari
   * FIX CRITICO: Usa createWorkEntryFromData per parsare le entry come fa Dashboard/TimeEntryForm
   */
  async loadContext() {
    try {
      const now = Date.now();
      if (this._contextCache && (now - this._contextCacheTime) < this.CACHE_TTL) {
        return this._contextCache;
      }

      // Legge le impostazioni salvate in AsyncStorage (già unificate nel formato nuovo)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const cachedSettings = await AsyncStorage.getItem('app_settings_cache');
      const settings = cachedSettings ? JSON.parse(cachedSettings) : DEFAULT_SETTINGS;

      // Legge tutte le entry del mese corrente
      const nowDate = new Date();
      const year = nowDate.getFullYear();
      const month = nowDate.getMonth() + 1;
      let entries = await DatabaseService.getWorkEntries(year, month);

      // 🔥 FIX CRITICO: Parsa TUTTE le entries con createWorkEntryFromData
      // per garantire consistenza dei campi camelCase/snake_case con Dashboard e TimeEntryForm
      entries = entries.map(entry => {
        const parsed = createWorkEntryFromData(entry);
        // Conserva l'ID e la data originale
        parsed.id = entry.id;
        parsed.date = entry.date;
        return parsed;
      });

      // Calcola i breakdown per ogni entry usando l'helper
      console.log(`🧠 AI - Inizio ricalcolo breakdown per ${entries.length} entries...`);
      
      entries = await this.calcHelper.loadEntriesWithBreakdowns(
        () => entries,
        settings
      );

      console.log(`✅ AI - Ricalcolo breakdown completato per ${entries.length} entries`);

      const context = { settings, workEntries: entries };
      this._contextCache = context;
      this._contextCacheTime = now;
      return context;
    } catch (error) {
      console.warn('Errore caricamento contesto AI:', error);
      return { settings: DEFAULT_SETTINGS, workEntries: [] };
    }
  }

  invalidateContextCache() {
    this._contextCache = null;
    this._contextCacheTime = 0;
  }

  // ========== RISPOSTE - OGNI FUNZIONALITÀ MOSTRA STATO + OPZIONI ==========

  _answerOvertimeDay(settings) {
    const rate = this._getHourlyRate(settings);
    const contract = this._getContract(settings);
    const bonusRate = rate * (contract.overtimeRates?.day || 1.2);
    const method = settings?.calculationMethod || 'DAILY_RATE_WITH_SUPPLEMENTS';
    const mixedEnabled = settings?.mixedCalculationEnabled !== false;
    
    return (
      `💰 **Straordinario Diurno (+20%)**\n\n` +
      `Si applica per le ore di lavoro **oltre le 8h giornaliere**, dal lunedì al venerdì, 6:00-20:00.\n\n` +
      `**Il tuo calcolo (${this._getContractName(settings)}):**\n` +
      `• Tariffa base: ${this._fmt(rate)}/h\n` +
      `• +20% → **${this._fmt(bonusRate)}/h**\n` +
      `• 2h → ${this._fmt(bonusRate * 2)}\n\n` +
      `**Stato attuale:** maggiorazione automatica applicata dall'app.\n` +
      `**Metodo di calcolo attivo:** ${method === 'PURE_HOURLY_WITH_MULTIPLIERS' ? 'Tariffe Orarie Pure' : 'Tariffa Giornaliera + Maggiorazioni CCNL'}\n` +
      `**Calcolo misto:** ${mixedEnabled ? '✅ Attivo (usa il metodo più vantaggioso)' : '❌ Disattivato'}\n\n` +
      `**Opzioni:** puoi personalizzare le maggiorazioni in **Impostazioni → Fasce Orarie Avanzate**.`
    );
  }

  _answerOvertimeEvening(settings) {
    const rate = this._getHourlyRate(settings);
    const contract = this._getContract(settings);
    const bonusRate = rate * (contract.overtimeRates?.overtimeNightUntil22 || contract.overtimeRates?.nightUntil22 || 1.25);
    return (
      `🌆 **Straordinario Serale (+25%)**\n\n` +
      `Si applica per ore lavorate in fascia **20:00-22:00** oltre le 8h.\n\n` +
      `**Il tuo calcolo (${this._getContractName(settings)}):**\n` +
      `• Tariffa base: ${this._fmt(rate)}/h\n` +
      `• +25% → **${this._fmt(bonusRate)}/h**`
    );
  }

  _answerOvertimeNight(settings) {
    const rate = this._getHourlyRate(settings);
    const contract = this._getContract(settings);
    const nightFino22 = rate * (contract.overtimeRates?.overtimeNightUntil22 || 1.45);
    const nightDopo22 = rate * (contract.overtimeRates?.overtimeNightAfter22 || 1.5);
    return (
      `🌙 **Straordinario Notturno**\n\n` +
      `Oltre 8h in fascia 20:00-6:00:\n\n` +
      `**Il tuo calcolo (${this._getContractName(settings)}):**\n` +
      `• Fino 22:00 (+45%): **${this._fmt(nightFino22)}/h**\n` +
      `• Dopo 22:00 (+50%): **${this._fmt(nightDopo22)}/h**\n\n` +
      `ℹ️ *Notturno ordinario (≤8h) = +25%.*`
    );
  }

  _answerOvertimeHoliday(settings) {
    const rate = this._getHourlyRate(settings);
    const contract = this._getContract(settings);
    const holidayRate = rate * (contract.overtimeRates?.holiday || 1.3);
    const straordFestivo = rate * 1.5;
    const notturnoFestivo = rate * 1.6;
    return (
      `🎉 **Straordinario Festivo/Domenicale**\n\n` +
      `**Il tuo calcolo (${this._getContractName(settings)}):**\n` +
      `• Ordinario (≤8h) +30%: **${this._fmt(holidayRate)}/h**\n` +
      `• Straordinario (oltre 8h) +50%: **${this._fmt(straordFestivo)}/h**\n` +
      `• Notturno festivo +60%: **${this._fmt(notturnoFestivo)}/h**`
    );
  }

  _answerHourlyRate(settings) {
    const rate = this._getHourlyRate(settings);
    const salary = this._getMonthlySalary(settings);
    const contract = this._getContract(settings);
    const method = settings?.calculationMethod || 'DAILY_RATE_WITH_SUPPLEMENTS';
    const mixedEnabled = settings?.mixedCalculationEnabled !== false;
    return (
      `⏱️ **Tariffa Oraria**\n\n` +
      `**La tua tariffa base:** ${this._fmt(rate)}/h\n` +
      `*(${this._fmt(salary)} ÷ 173h mese)*\n\n` +
      `**Maggiorazioni sul tuo contratto (${contract.name}):**\n` +
      `• Ordinario: ${this._fmt(rate)}/h\n` +
      `• Straord. diurno (+${Math.round((contract.overtimeRates?.day - 1) * 100)}%): ${this._fmt(rate * contract.overtimeRates?.day)}/h\n` +
      `• Notturno ord. (+${Math.round((contract.overtimeRates?.nightUntil22 - 1) * 100)}%): ${this._fmt(rate * contract.overtimeRates?.nightUntil22)}/h\n` +
      `• Festivo ord. (+${Math.round((contract.overtimeRates?.holiday - 1) * 100)}%): ${this._fmt(rate * contract.overtimeRates?.holiday)}/h\n` +
      `• Straord. notturno fino 22 (+${Math.round(((contract.overtimeRates?.overtimeNightUntil22 || 1.45) - 1) * 100)}%): ${this._fmt(rate * (contract.overtimeRates?.overtimeNightUntil22 || 1.45))}/h\n` +
      `• Straord. notturno dopo 22 (+${Math.round(((contract.overtimeRates?.overtimeNightAfter22 || 1.5) - 1) * 100)}%): ${this._fmt(rate * (contract.overtimeRates?.overtimeNightAfter22 || 1.5))}/h\n` +
      `• Straord. festivo (+50%): ${this._fmt(rate * 1.5)}/h\n` +
      `• Notturno festivo (+60%): ${this._fmt(rate * 1.6)}/h\n\n` +
      `**Metodo di calcolo attivo:** ${method === 'PURE_HOURLY_WITH_MULTIPLIERS' ? 'Tariffe Orarie Pure' : 'Tariffa Giornaliera + Maggiorazioni CCNL'}\n` +
      `**Calcolo misto:** ${mixedEnabled ? '✅ Attivo (confronta entrambi i metodi e usa il più vantaggioso)' : '❌ Disattivato'}\n\n` +
      `**Contratto attivo:** ${contract.name}\n` +
      `📱 *Per cambiare contratto: **Impostazioni → Contratto CCNL**.*`
    );
  }

  _answerDailyRate(settings) {
    const dailyRate = this._getDailyRate(settings);
    const salary = this._getMonthlySalary(settings);
    const contract = this._getContract(settings);
    return (
      `📅 **Tariffa Giornaliera**\n\n` +
      `**La tua tariffa (${contract.name}):** ${this._fmt(dailyRate)}/giorno\n` +
      `*(${this._fmt(salary)} ÷ ${contract.workingDaysPerMonth || 26} giorni)*\n\n` +
      `💡 *Copre fino a 8h in giornata feriale. Eccedenza = straordinario o viaggio a seconda della modalità configurata.*`
    );
  }

  _answerSalary(settings) {
    const contract = this._getContract(settings);
    const salary = this._getMonthlySalary(settings);
    const daily = this._getDailyRate(settings);
    const hourly = this._getHourlyRate(settings);
    const annualGross = salary * 12;
    return (
      `💼 **Retribuzione CCNL**\n\n` +
      `**${contract.name}**\n\n` +
      `• **Mensile**: ${this._fmt(salary)}\n` +
      `• **Annua lorda**: ${this._fmt(annualGross)} (×12 mensilità)\n` +
      `• **Giornaliero**: ${this._fmt(daily)}\n` +
      `• **Orario**: ${this._fmt(hourly)}\n` +
      `• **Giorni/mese**: ${contract.workingDaysPerMonth || 26}\n\n` +
      `ℹ️ *I valori sono aggiornati al ${contract.lastUpdated || '01/06/2025'} (fonte: ${contract.source || 'Unionmeccanica Confapi'})*\n\n` +
      `📱 *Modifica in **Impostazioni → Contratto CCNL**.*`
    );
  }

  _answerContract(settings) {
    const contract = this._getContract(settings);
    const contractKey = contract.key || 'METAL_PMI_L5';
    const standbyRates = this._getStandbyRates(settings);
    return (
      `📋 **Contratto CCNL Attivo**\n\n` +
      `**${contract.name}**\n\n` +
      `**Maggiorazioni:**\n` +
      `• Straord. diurno: +${Math.round((contract.overtimeRates?.day - 1) * 100)}%\n` +
      `• Notturno ordinario: +${Math.round((contract.overtimeRates?.nightUntil22 - 1) * 100)}%\n` +
      `• Festivo ordinario: +${Math.round((contract.overtimeRates?.holiday - 1) * 100)}%\n` +
      `• Straord. notturno fino 22h: +${Math.round(((contract.overtimeRates?.overtimeNightUntil22 || 1.45) - 1) * 100)}%\n` +
      `• Straord. notturno dopo 22h: +${Math.round(((contract.overtimeRates?.overtimeNightAfter22 || 1.5) - 1) * 100)}%\n` +
      `• Straord. festivo: +50%\n` +
      `• Notturno festivo: +60%\n\n` +
      `**Reperibilità:** feriale 16h ${this._fmt(standbyRates.feriale16)}, 24h ${this._fmt(standbyRates.feriale24)}, festivo 24h ${this._fmt(standbyRates.festivo24)}\n\n` +
      `📱 **Per cambiare:** **Impostazioni → Contratto CCNL**\n` +
      `   Scegli tra 9 livelli (L1-L9) con tariffe e indennità diverse.`
    );
  }

  _answerImpostazioniContratto(settings) {
    const contract = this._getContract(settings);
    const level = this._getContractLevel(settings);
    const standbyGroup = level <= 3 ? 'L1-L3' : (level <= 5 ? 'L4-L5' : 'Super 5 (L6-L9)');
    const standbyRates = this._getStandbyRates(settings);
    
    return (
      `⚙️ **Impostazioni Contratto CCNL**\n\n` +
      `**STATO ATTUALE:**\n` +
      `• Contratto selezionato: **${contract.name}**\n` +
      `• Gruppo reperibilità: **${standbyGroup}**\n` +
      `• Mensile: ${this._fmt(this._getMonthlySalary(settings))}\n` +
      `• Orario: ${this._fmt(this._getHourlyRate(settings))}\n` +
      `• Giornaliero: ${this._fmt(this._getDailyRate(settings))}\n` +
      `• Aggiornato al: ${contract.lastUpdated || '01/06/2025'}\n\n` +
      `**Reperibilità per il tuo gruppo:**\n` +
      `• Feriale 16h: ${this._fmt(standbyRates.feriale16)}\n` +
      `• Feriale 24h: ${this._fmt(standbyRates.feriale24)}\n` +
      `• Festivo 24h: ${this._fmt(standbyRates.festivo24)}\n\n` +
      `**OPZIONI DISPONIBILI (tutti i livelli CCNL Metalmeccanico PMI):**\n` +
      `• **Livello 1** — €${CCNL_CONTRACTS.METALMECCANICO_PMI_L1.monthlySalary}/mese (orario: €${CCNL_CONTRACTS.METALMECCANICO_PMI_L1.hourlyRate})\n` +
      `• **Livello 2** — €${CCNL_CONTRACTS.METALMECCANICO_PMI_L2.monthlySalary}/mese (orario: €${CCNL_CONTRACTS.METALMECCANICO_PMI_L2.hourlyRate})\n` +
      `• **Livello 3** — €${CCNL_CONTRACTS.METALMECCANICO_PMI_L3.monthlySalary}/mese (orario: €${CCNL_CONTRACTS.METALMECCANICO_PMI_L3.hourlyRate})\n` +
      `• **Livello 4** — €${CCNL_CONTRACTS.METALMECCANICO_PMI_L4.monthlySalary}/mese (orario: €${CCNL_CONTRACTS.METALMECCANICO_PMI_L4.hourlyRate})\n` +
      `• **Livello 5** — €${CCNL_CONTRACTS.METALMECCANICO_PMI_L5.monthlySalary}/mese (orario: €${CCNL_CONTRACTS.METALMECCANICO_PMI_L5.hourlyRate})\n` +
      `• **Livello 6** — €${CCNL_CONTRACTS.METALMECCANICO_PMI_L6.monthlySalary}/mese (orario: €${CCNL_CONTRACTS.METALMECCANICO_PMI_L6.hourlyRate})\n` +
      `• **Livello 7** — €${CCNL_CONTRACTS.METALMECCANICO_PMI_L7.monthlySalary}/mese (orario: €${CCNL_CONTRACTS.METALMECCANICO_PMI_L7.hourlyRate})\n` +
      `• **Livello 8** — €${CCNL_CONTRACTS.METALMECCANICO_PMI_L8.monthlySalary}/mese (orario: €${CCNL_CONTRACTS.METALMECCANICO_PMI_L8.hourlyRate})\n` +
      `• **Livello 9** — €${CCNL_CONTRACTS.METALMECCANICO_PMI_L9.monthlySalary}/mese (orario: €${CCNL_CONTRACTS.METALMECCANICO_PMI_L9.hourlyRate})\n\n` +
      `📱 **Vai a:** **Impostazioni → Contratto CCNL** per modificare.\n` +
      `💡 *I valori includono le tranche di adeguamento IPCA giugno 2025.*`
    );
  }

  _answerMetodoCalcolo(settings) {
    const method = settings?.calculationMethod || 'DAILY_RATE_WITH_SUPPLEMENTS';
    const mixedEnabled = settings?.mixedCalculationEnabled !== false;
    
    const methodDesc = method === 'DAILY_RATE_WITH_SUPPLEMENTS' 
      ? 'Tariffa Giornaliera + Maggiorazioni CCNL (conforme)'
      : 'Tariffe Orarie Pure con Moltiplicatori';
    
    return (
      `⚙️ **Metodo di Calcolo**\n\n` +
      `**STATO ATTUALE:**\n` +
      `• Metodo: **${methodDesc}**\n` +
      `• Calcolo misto: ${mixedEnabled ? '✅ **Attivo** (usa il metodo più vantaggioso)' : '❌ **Disattivato**'}\n\n` +
      `**COME FUNZIONA:**\n` +
      `1. **CCNL conforme (Tariffa Giornaliera + Maggiorazioni)**\n` +
      `   Usa la diaria CCNL per le prime 8h, poi applica maggiorazioni CCNL per fasce orarie.\n` +
      `   Esempio: 10h feriali diurne → diaria (8h) + 2h × tariffa oraria × 1.20\n\n` +
      `2. **Tariffe Orarie Pure**\n` +
      `   Ogni ora viene pagata con la tariffa della fascia oraria corrispondente.\n` +
      `   Esempio: 6:00-20:00 tariffa base, 20:00-22:00 +25%, 22:00-6:00 +35%\n\n` +
      `3. **Calcolo Misto** (consigliato, attivo di default)\n` +
      `   Confronta i due metodi e usa automaticamente il più vantaggioso.\n\n` +
      `📱 **Vai a:** **Impostazioni → Metodo di Calcolo** per modificare.`
    );
  }

  _answerFasceOrarie(settings) {
    const enabled = settings?.enableTimeBasedRates || false;
    
    return (
      `⚙️ **Fasce Orarie Avanzate**\n\n` +
      `**STATO ATTUALE:**\n` +
      `• Fasce orarie personalizzate: ${enabled ? '✅ **Attive**' : '❌ **Disattive** (usa maggiorazioni CCNL standard)'}\n\n` +
      `**COSA FA:**\n` +
      `Permette di definire fasce orarie personalizzate con maggiorazioni diverse per ogni fascia, ` +
      `sostituendo le maggiorazioni standard CCNL.\n\n` +
      `**Esempi di configurazione:**\n` +
      `• 06:00-14:00 → tariffa base (nessuna maggiorazione)\n` +
      `• 14:00-22:00 → +15% (maggiorazione pomeridiana)\n` +
      `• 22:00-06:00 → +25% (maggiorazione notturna)\n\n` +
      `**Nota:** Se attivo e il metodo di calcolo è "Tariffe Orarie Pure", ` +
      `vengono usate le tue fasce personalizzate invece delle maggiorazioni CCNL standard.\n\n` +
      `📱 **Vai a:** **Impostazioni → Fasce Orarie Avanzate** per configurare.`
    );
  }

  _answerCalcoloNetto(settings) {
    const netSettings = settings?.netCalculation || {};
    const method = netSettings.method || 'irpef';
    const deductionRate = method === 'custom' ? (netSettings.customDeductionRate || 32) : 27;
    const useDetailed = netSettings.useDetailedCalculation !== false;
    const gross = this._getMonthlySalary(settings);
    const deductionAmount = gross * (deductionRate / 100);
    const netEstimate = gross - deductionAmount;
    
    return (
      `💰 **Trattenute e Calcolo Netto**\n\n` +
      `**STATO ATTUALE DELLE TUE IMPOSTAZIONI:**\n` +
      `• Metodo di calcolo: **${method === 'irpef' ? 'Aliquote IRPEF reali' : 'Percentuale personalizzata'}**\n` +
      `• Percentuale trattenute: **${deductionRate}%**\n` +
      `• Calcolo dettagliato: ${useDetailed ? '✅ **Attivo**' : '❌ **Solo rapido**'}\n\n` +
      `**Esempio sul tuo stipendio base (${this._getContractName(settings)}):**\n` +
      `• Stipendio lordo: ${this._fmt(gross)}\n` +
      `• Trattenute (${deductionRate}%): **-${this._fmt(deductionAmount)}**\n` +
      `• **Netto stimato: ${this._fmt(netEstimate)}**\n\n` +
      `ℹ️ *Il valore è indicativo. Le trattenute reali includono INPS (9.19%), IRPEF (scaglioni progressivi 23-35-43%), ` +
      `addizionali regionali e comunali. L'app calcola una stima basata sulla percentuale configurata.*\n\n` +
      `**OPZIONI DISPONIBILI:**\n` +
      `• **IRPEF reale**: calcola con aliquote 2025 (23% fino a 28k€, 35% fino a 50k€, 43% oltre)\n` +
      `• **Personalizzato**: imposta una percentuale fissa di trattenute\n` +
      `• Valori tipici: 25-30% per dipendenti standard\n\n` +
      `📱 **Vai a:** **Impostazioni → Calcolo Netto** per modificare.`
    );
  }

  _answerImpostazioniGenerali(settings) {
    const contract = this._getContract(settings);
    const method = settings?.calculationMethod || 'DAILY_RATE_WITH_SUPPLEMENTS';
    const methodDesc = method === 'DAILY_RATE_WITH_SUPPLEMENTS' 
      ? 'Tariffa Giornaliera + Maggiorazioni CCNL'
      : 'Tariffe Orarie Pure';
    
    return (
      `⚙️ **Tutte le Impostazioni**\n\n` +
      `**RIEPILOGO DELLA TUA CONFIGURAZIONE ATTUALE:**\n` +
      `1. 📄 **Contratto CCNL**: **${contract.name}**\n` +
      `2. 💰 **Calcolo Netto**: ${(settings?.netCalculation?.method === 'custom' ? `Personalizzato (${settings?.netCalculation?.customDeductionRate || 32}%)` : 'IRPEF reale')}\n` +
      `3. 🕐 **Fasce Orarie Avanzate**: ${settings?.enableTimeBasedRates ? '✅ Attive' : '❌ Disattive'}\n` +
      `4. 🔢 **Metodo di Calcolo**: **${methodDesc}** (misto: ${settings?.mixedCalculationEnabled !== false ? '✅' : '❌'})\n` +
      `5. 🚗 **Ore di Viaggio**: ${settings?.travelHoursSetting || 'TRAVEL_RATE_EXCESS'} (compenso: ${Math.round((settings?.travelCompensationRate || 1.0) * 100)}% tariffa)\n` +
      `6. 🟡 **Reperibilità**: ${settings?.standbySettings?.enabled ? '✅ Attiva' : '❌ Disattivata'}\n` +
      `7. 🧳 **Indennità Trasferta**: ${settings?.travelAllowance?.enabled ? `✅ Attiva (${this._fmt(settings.travelAllowance.dailyAmount || 0)}/g)` : '❌ Disattivata'}\n` +
      `8. 🍽️ **Rimborsi Pasti**: ${settings?.mealAllowances?.enabled !== false ? '✅ Attivi' : '❌ Disattivati'}\n\n` +
      `Ecco cosa puoi configurare nell'app:\n` +
      `1. 📄 **Contratto CCNL** — Scegli livello e tariffe\n` +
      `2. 💰 **Calcolo Netto** — Percentuale trattenute\n` +
      `3. 🕐 **Fasce Orarie Avanzate** — Maggiorazioni personalizzate\n` +
      `4. 🔢 **Metodo di Calcolo** — CCNL conforme o orario puro\n` +
      `5. 🚗 **Ore di Viaggio** — Modalità calcolo trasferte\n` +
      `6. 🟡 **Reperibilità** — Indennità e calendario\n` +
      `7. 🧳 **Indennità Trasferta** — Contributi giornalieri\n` +
      `8. 🍽️ **Rimborsi Pasti** — Buoni pasto e cash\n` +
      `9. 📅 **Ferie e Permessi** — Gestione richieste\n` +
      `10. 🔔 **Notifiche** — Promemoria e avvisi\n` +
      `11. 🎨 **Tema e Aspetto** — Dark/light mode\n` +
      `12. 💾 **Backup e Ripristino** — Salvataggio dati\n\n` +
      `📱 **Vai in Impostazioni** per esplorare tutte le opzioni.\n` +
      `💡 *Chiedimi "come funziona [nome impostazione]" per dettagli!*`
    );
  }

  _answerStandby(settings) {
    const contractKey = this._getContract(settings).key;
    const standbySettings = settings?.standbySettings || {};
    const enabled = standbySettings.enabled || false;
    const allowanceType = standbySettings.allowanceType || '24h';
    const standbyRates = this._getStandbyRates(settings);
    const saturdayMode = standbySettings.saturdayMode || (standbySettings.saturdayAsRest ? 'festivo' : 'feriale');
    
    // Personalizzazioni
    const customFeriale16 = standbySettings.customFeriale16;
    const customFeriale24 = standbySettings.customFeriale24;
    const customFestivo = standbySettings.customFestivo;
    
    return (
      `🟡 **Reperibilità (Pronta Disponibilità)**\n\n` +
      `**STATO ATTUALE:**\n` +
      `• Reperibilità: ${enabled ? '✅ **Attiva**' : '❌ **Disattivata**'}\n` +
      `• Tipo indennità: **${allowanceType === '16h' ? '16h' : '24h'}**\n` +
      `• Sabato come riposo: ${standbySettings.saturdayAsRest ? '✅' : '❌'} (modalità: ${saturdayMode === 'festivo' ? 'festivo' : 'feriale24/feriale'})\n\n` +
      `**Indennità CCNL per il tuo gruppo (da contratto ${this._getContractName(settings)}):**\n` +
      `• Feriale 16h: ${this._fmt(standbyRates.feriale16)}${customFeriale16 ? ` (personalizzato: ${this._fmt(customFeriale16)})` : ''}\n` +
      `• Feriale 24h: ${this._fmt(standbyRates.feriale24)}${customFeriale24 ? ` (personalizzato: ${this._fmt(customFeriale24)})` : ''}\n` +
      `• Festivo 24h: ${this._fmt(standbyRates.festivo24)}${customFestivo ? ` (personalizzato: ${this._fmt(customFestivo)})` : ''}\n\n` +
      `**OPZIONI:**\n` +
      `• Attiva/disattiva reperibilità\n` +
      `• Scegli indennità 16h o 24h\n` +
      `• Personalizza importi (sostituisce i valori CCNL)\n` +
      `• Calendario giorni di reperibilità\n` +
      `• Sabato come giorno di riposo (indennità festivo)\n\n` +
      `📱 **Vai a:** **Impostazioni → Reperibilità** per modificare.`
    );
  }

  _answerStandbyIntervention(settings) {
    const rate = this._getHourlyRate(settings);
    const contract = this._getContract(settings);
    return (
      `🔧 **Intervento in Reperibilità**\n\n` +
      `Retribuiti con maggiorazioni CCNL (${this._getContractName(settings)}):\n\n` +
      `**Il tuo calcolo:**\n` +
      `• **Diurno** (+${Math.round((contract.overtimeRates?.day - 1) * 100)}%): ${this._fmt(rate * contract.overtimeRates?.day)}/h\n` +
      `• **Serale** (+${Math.round(((contract.overtimeRates?.overtimeNightUntil22 || 1.45) - 1) * 100)}%): ${this._fmt(rate * (contract.overtimeRates?.overtimeNightUntil22 || 1.45))}/h\n` +
      `• **Notturno** (+${Math.round(((contract.overtimeRates?.overtimeNightAfter22 || 1.5) - 1) * 100)}%): ${this._fmt(rate * (contract.overtimeRates?.overtimeNightAfter22 || 1.5))}/h\n` +
      `• **Festivo** (+60%): ${this._fmt(rate * 1.6)}/h\n\n` +
      `⚠️ *Indennità giornaliera si AGGIUNGE alla retribuzione dell'intervento.*\n` +
      `ℹ️ *Il CCNL Metalmeccanico PMI non prevede una retribuzione aggiuntiva per la prima uscita: ogni intervento è retribuito secondo le maggiorazioni orarie.*`
    );
  }

  _answerTravel(settings) {
    const mode = settings?.travelHoursSetting || 'TRAVEL_RATE_EXCESS';
    const compRate = settings?.travelCompensationRate || 1.0;
    const rate = this._getHourlyRate(settings);
    const multiShiftAsWork = settings?.multiShiftTravelAsWork || false;

    const modeLabels = {
      'TRAVEL_RATE_EXCESS': '🛣️ Viaggio eccedente con tariffa viaggio (DEFAULT)',
      'TRAVEL_RATE_ALL': '🛣️ Viaggio sempre con tariffa viaggio',
      'OVERTIME_EXCESS': '⏰ Viaggio eccedente come straordinario',
    };

    const modeDescriptions = {
      'TRAVEL_RATE_EXCESS': 'Solo le ore di viaggio che superano le 8h giornaliere vengono pagate con la tariffa viaggio. Le ore di viaggio entro le 8h sono incluse nella diaria CCNL.',
      'TRAVEL_RATE_ALL': 'Tutte le ore di viaggio vengono sempre pagate separatamente con la tariffa viaggio, in aggiunta alla diaria CCNL.',
      'OVERTIME_EXCESS': 'Le ore di viaggio che superano le 8h giornaliere vengono pagate come straordinario con le maggiorazioni CCNL (+20% diurno, ecc.).',
    };

    return (
      `🚗 **Ore di Viaggio**\n\n` +
      `**STATO ATTUALE:**\n` +
      `• Modalità: **${modeLabels[mode] || mode}**\n` +
      `• Compenso viaggio: **${(compRate * 100).toFixed(0)}%** della tariffa base\n` +
      `• Tariffa viaggio effettiva: **${this._fmt(rate * compRate)}/h**\n` +
      `• Viaggi multi-cantiere come lavoro: ${multiShiftAsWork ? '✅ **Attivo**' : '❌ **Disattivo**'}\n\n` +
      `**${modeLabels[mode] || mode}**\n` +
      `${modeDescriptions[mode] || ''}\n\n` +
      `**OPZIONI DISPONIBILI:**\n` +
      `1. **Viaggio eccedente con tariffa viaggio** (default consigliato)\n` +
      `   Solo le ore eccedenti le 8h sono pagate come viaggio.\n\n` +
      `2. **Viaggio sempre con tariffa viaggio**\n` +
      `   Il viaggio è SEMPRE pagato in più, non consuma le 8h di lavoro.\n\n` +
      `3. **Viaggio eccedente come straordinario**\n` +
      `   Ore oltre 8h pagate come straordinario con maggiorazioni CCNL.\n\n` +
      `4. **Multi-cantiere: spostamenti come lavoro**\n` +
      `   Se attivo, gli spostamenti tra cantieri diversi sono pagati come ore di lavoro, non come viaggio.\n\n` +
      `📱 **Vai a:** **Impostazioni → Ore di Viaggio** per modificare.`
    );
  }

  _answerTravelAllowance(settings) {
    const allowance = settings?.travelAllowance || {};
    const amount = allowance.dailyAmount || 15;
    const enabled = allowance.enabled || false;
    const selectedOptions = allowance.selectedOptions || [allowance.option || 'WITH_TRAVEL'];
    const applyOnSpecialDays = allowance.applyOnSpecialDays || false;
    
    const optionLabels = {
      'WITH_TRAVEL': 'Con viaggio (solo se ci sono ore di viaggio)',
      'ALWAYS': 'Sempre (applicata sempre)',
      'FULL_DAY_ONLY': 'Solo giornata intera (solo se ≥8h lavorate)',
      'PROPORTIONAL_CCNL': 'Proporzionale CCNL (in base alle ore lavorate)',
      'HALF_ALLOWANCE_HALF_DAY': 'Mezza indennità (50% per mezze giornate)',
      'FULL_ALLOWANCE_HALF_DAY': 'Indennità piena anche per mezze giornate',
    };
    
    return (
      `🧳 **Indennità Trasferta**\n\n` +
      `**STATO ATTUALE:**\n` +
      `• Indennità: ${enabled ? `✅ **Attiva** — ${this._fmt(amount)}/giorno` : '❌ **Disattivata**'}\n` +
      `• Opzioni attive: ${selectedOptions.map(o => optionLabels[o] || o).join(', ')}\n` +
      `• Applica nei giorni festivi/domeniche: ${applyOnSpecialDays ? '✅ Sì' : '❌ No'}\n\n` +
      `**OPZIONI DISPONIBILI:**\n` +
      `• **Con viaggio** — solo se ci sono ore di viaggio\n` +
      `• **Sempre** — applicata sempre\n` +
      `• **Solo giornata intera** — solo se ≥8h lavorate\n` +
      `• **Proporzionale CCNL** — in base alle ore lavorate (include reperibilità)\n` +
      `• **Mezza indennità** — 50% per mezze giornate\n` +
      `• **Indennità piena** — importo pieno anche per mezze giornate\n\n` +
      `💡 *L'indennità è netta e si aggiunge alla retribuzione lorda.*\n` +
      `📱 **Vai a:** **Impostazioni → Indennità Trasferta** per modificare.`
    );
  }

  _answerMeals(settings) {
    const lunch = settings?.mealAllowances?.lunch || {};
    const dinner = settings?.mealAllowances?.dinner || {};
    const enabled = settings?.mealAllowances?.enabled !== false;
    
    return (
      `🍽️ **Rimborsi Pasti**\n\n` +
      `**STATO ATTUALE:**\n` +
      `• Rimborsi: ${enabled ? '✅ **Attivi**' : '❌ **Disattivati**'}\n` +
      `• Pranzo buono: ${this._fmt(lunch.voucherAmount || 5.29)} | Cash: ${this._fmt(lunch.cashAmount || 0)}\n` +
      `• Cena buono: ${this._fmt(dinner.voucherAmount || 5.29)} | Cash: ${this._fmt(dinner.cashAmount || 0)}\n\n` +
      `**OPZIONI:**\n` +
      `• Importo buono pasto (pranzo e cena separati)\n` +
      `• Importo cash alternativo\n` +
      `• Assegnazione: automatica in base agli orari (pranzo 12-14, cena 19-21)\n` +
      `• Nel form di inserimento orario, puoi specificare importi personalizzati per ogni giorno\n\n` +
      `📱 **Vai a:** **Impostazioni → Rimborsi Pasti** per modificare.`
    );
  }

  _answerVacation() {
    return (
      `🏖️ **Ferie**\n\n` +
      `**Come segnare:** **Inserimento Orario** → Tipo giornata: **Ferie** → Salva ✅\n\n` +
      `**CCNL Metalmeccanico PMI:**\n` +
      `• **26 giorni** all'anno (full-time)\n` +
      `• Pagate con tariffa giornaliera CCNL\n` +
      `• NON conteggiate come giorni lavorati\n` +
      `• Per giorni senza ore, viene comunque mostrata la retribuzione giornaliera (impostazione modificabile)\n\n` +
      `📱 **Gestisci in:** **Impostazioni → Ferie e Permessi**`
    );
  }

  _answerPermits() {
    return (
      `📅 **Permessi Retribuiti**\n\n` +
      `**Come segnare:** **Inserimento Orario** → Tipo giornata: **Permesso** → Salva ✅\n\n` +
      `**CCNL Metalmeccanico PMI:**\n` +
      `• **72 ore** annue di permessi retribuiti (full-time)\n` +
      `• Diverse dalle ROL (72h) = **144 ore/anno** totali tra permessi e ROL\n\n` +
      `📱 **Gestisci in:** **Impostazioni → Ferie e Permessi**`
    );
  }

  _answerROL() {
    return (
      `⏰ **ROL (Riduzione Orario Lavoro)**\n\n` +
      `Ex festività — ore di permesso per festività soppresse.\n\n` +
      `**CCNL Metalmeccanico PMI:**\n` +
      `• **72 ore** annue\n` +
      `• Accumulabili in banca ore\n` +
      `• Diverse dai permessi (72h) = **144 ore/anno** totali\n\n` +
      `📱 **Verifica in:** **Impostazioni → Ferie e Permessi**`
    );
  }

  _answerSickLeave() {
    return (
      `🏥 **Malattia**\n\n` +
      `**Come segnare:** **Inserimento Orario** → Tipo giornata: **Malattia** → Salva ✅\n\n` +
      `**CCNL Metalmeccanico PMI:**\n` +
      `• Comporto: 180 giorni annui\n` +
      `• Primi 3gg: 100% azienda\n` +
      `• 4°-20°: 50% INPS + integrazione azienda\n` +
      `• 21°-180°: 66,66% INPS\n\n` +
      `⚠️ *Certificato medico per assenze >3 giorni.*`
    );
  }

  async _answerMyStats(context) {
    const { workEntries } = context;
    if (!workEntries || workEntries.length === 0) {
      return (
        `📊 **I tuoi dati**\n\n` +
        `Nessun dato per il mese corrente. Premi **+** in Dashboard o vai su **Inserimento Orario**.`
      );
    }

    const stats = await this.calcHelper.aggregateMonthlyStats(workEntries, context.settings);
    const contractName = this._getContractName(context.settings);

    return (
      `📊 **Le tue statistiche - Mese corrente**\n\n` +
      `**Basate sui dati della Dashboard** (stesso motore di calcolo)\n\n` +
      `• **Giorni registrati**: ${stats.daysWorked}\n` +
      `• **Ore totali**: ${this._fmtHours(stats.totalHours)}\n` +
      `• **Media**: ${this._fmtHours(stats.averageHoursPerDay)}/giorno\n\n` +
      `**Guadagni dettagliati:**\n` +
      `• Ordinario: ${this._fmt(stats.totalOrdinary)}\n` +
      (stats.totalOvertime > 0 ? `• Straordinario: ${this._fmt(stats.totalOvertime)}\n` : '') +
      (stats.totalTravel > 0 ? `• Indennità viaggio: ${this._fmt(stats.totalTravel)}\n` : '') +
      (stats.totalStandby > 0 ? `• Reperibilità: ${this._fmt(stats.totalStandby)}\n` : '') +
      (stats.totalMeals > 0 ? `• Indennità pasto: ${this._fmt(stats.totalMeals)}\n` : '') +
      `\n💰 **Totale mensile**: ${this._fmt(stats.totalEarnings)}\n` +
      `• Giorni con straordinario (>8h): ${stats.daysWithOvertime}\n\n` +
      `**Contratto:** ${contractName}\n\n` +
      `💡 *Dettaglio completo in **Dashboard**.*`
    );
  }

  async _answerMonthlySummary(context) {
    const { workEntries } = context;
    if (!workEntries || workEntries.length === 0) {
      return `📅 **Riepilogo mensile**\n\nNessun dato per il mese corrente. Inserisci i tuoi orari!`;
    }

    const stats = await this.calcHelper.aggregateMonthlyStats(workEntries, context.settings);
    const salary = this._getMonthlySalary(context.settings);

    return (
      `📅 **Riepilogo Mensile**\n\n` +
      `**Basato sui dati della Dashboard** (stesso motore di calcolo)\n\n` +
      `• **Giorni registrati**: ${stats.daysWorked}\n` +
      `• **Ore totali**: ${this._fmtHours(stats.totalHours)}\n` +
      `• **Media**: ${this._fmtHours(stats.averageHoursPerDay)}/giorno\n\n` +
      `**Economico:**\n` +
      `• Stipendio CCNL base: ${this._fmt(salary)}\n` +
      `• Guadagno ordinario: ${this._fmt(stats.totalOrdinary)}\n` +
      (stats.totalOvertime > 0 ? `• Straordinario: ${this._fmt(stats.totalOvertime)}\n` : '') +
      (stats.totalTravel > 0 ? `• Indennità viaggio: ${this._fmt(stats.totalTravel)}\n` : '') +
      (stats.totalStandby > 0 ? `• Reperibilità: ${this._fmt(stats.totalStandby)}\n` : '') +
      (stats.totalMeals > 0 ? `• Indennità pasto: ${this._fmt(stats.totalMeals)}\n` : '') +
      `• Extra totale: ${this._fmt(stats.totalExtra)}\n` +
      `• **Lordo totale**: ${this._fmt(stats.totalEarnings)}\n\n` +
      `${stats.holidays > 0 ? `• Giorni festivi: ${stats.holidays}\n` : ''}` +
      `${stats.standbyDays > 0 ? `• Reperibilità pianificata: ${stats.standbyDays}\n` : ''}` +
      `\n💡 *Dettaglio completo in **Dashboard**.*`
    );
  }

  _answerHolidays() {
    return (
      `🎉 **Festività Nazionali**\n\n` +
      `L'app riconosce automaticamente:\n\n` +
      `• 1 Gennaio — Capodanno 🎆\n• 6 Gennaio — Epifania ⭐\n• Pasqua 🐣\n• Pasquetta 🐰\n• 25 Aprile 🕊️\n• 1 Maggio 🔧\n• 2 Giugno 🏛️\n• 15 Agosto ☀️\n• 1 Novembre 🕯️\n• 8 Dicembre 🙏\n• 25 Dicembre 🎄\n• 26 Dicembre 🎁\n\n` +
      `💡 *Maggiorazioni CCNL applicate automaticamente.*`
    );
  }

  _answerGuide() {
    return (
      `📖 **Guida Rapida WorkT**\n\n` +
      `**Schermate:**\n` +
      `1. 📊 **Dashboard** — Riepilogo e statistiche\n` +
      `2. ✏️ **Inserimento Orario** — Registra ore\n` +
      `3. ⚙️ **Impostazioni** — Contratti, viaggi, reperibilità, calcolo\n` +
      `4. 🤖 **Assistente** — Chat informativa\n\n` +
      `**Come iniziare:**\n` +
      `1. Configura il contratto in **Impostazioni**\n` +
      `2. Premi **+** in Dashboard per il primo orario\n` +
      `3. Consulta il riepilogo mensile\n\n` +
      `❓ *Chiedi qualcosa di specifico!*`
    );
  }

  _answerHowToEntry() {
    return (
      `✏️ **Come Inserire un Orario**\n\n` +
      `1. **Inserimento Orario** (tab centrale)\n` +
      `2. Seleziona **data** e **cantiere**\n` +
      `3. Inserisci orari: partenza, arrivo, lavoro, ritorno\n` +
      `4. Opzioni: **Reperibilità**, **Pasti**, **Trasferta**\n` +
      `5. **Salva** ✅\n\n` +
      `💡 *Puoi aggiungere più turni (più cantieri) nella stessa giornata.*`
    );
  }

  _answerBackup() {
    return (
      `💾 **Backup e Sicurezza Dati**\n\n` +
      `**STATO:** Dati salvati **localmente** in SQLite.\n\n` +
      `**Backup manuale:** **Impostazioni → Backup e Ripristino** → Esegui Backup\n` +
      `**Ripristino:** stesso menu → seleziona file .db\n\n` +
      `✅ **Backup automatico** periodico attivo.\n` +
      `🔒 *Dati mai inviati a server esterni.*\n` +
      `💡 *Il backup salva il database SQLite completo con tutte le impostazioni.*`
    );
  }

  _answerNotifications() {
    return (
      `🔔 **Notifiche e Promemoria**\n\n` +
      `**Cosa può ricordarti:**\n` +
      `• Inserire gli orari a fine giornata\n` +
      `• Turni di reperibilità programmati\n\n` +
      `**OPZIONI:**\n` +
      `• Attiva/disattiva promemoria giornalieri\n` +
      `• Imposta orari di notifica\n` +
      `• Notifiche per reperibilità\n\n` +
      `📱 **Vai a:** **Impostazioni → Notifiche** per configurare.\n` +
      `💡 *Funzionano in background su Android.*`
    );
  }

  _answerTheme() {
    return (
      `🎨 **Tema e Aspetto**\n\n` +
      `**OPZIONI:**\n` +
      `• **Chiaro** ☀️ — classico, leggibile all'esterno\n` +
      `• **Scuro** 🌙 — ideale la sera, meno affaticamento\n` +
      `• **Sistema** 📱 — segue le impostazioni del telefono\n\n` +
      `📱 **Vai a:** **Impostazioni → Tema e Aspetto** per cambiare.\n` +
      `💡 *Puoi cambiare tema in qualsiasi momento.*`
    );
  }

  _answerLavoroNotturno(settings) {
    const rate = this._getHourlyRate(settings);
    const contract = this._getContract(settings);
    const notturnoOrario = rate * (contract.overtimeRates?.nightUntil22 || 1.25);
    return (
      `🌙 **Lavoro Notturno Ordinario (+${Math.round(((contract.overtimeRates?.nightUntil22 || 1.25) - 1) * 100)}%)**\n\n` +
      `Fascia **22:00-6:00** entro le 8h giornaliere.\n\n` +
      `**Il tuo calcolo (${this._getContractName(settings)}):**\n` +
      `• Tariffa base: ${this._fmt(rate)}/h\n` +
      `• Notte +${Math.round(((contract.overtimeRates?.nightUntil22 || 1.25) - 1) * 100)}% → **${this._fmt(notturnoOrario)}/h**\n\n` +
      `**Differenza con straordinario notturno:**\n` +
      `• Ordinario (≤8h): +${Math.round(((contract.overtimeRates?.nightUntil22 || 1.25) - 1) * 100)}%\n` +
      `• Straord. oltre 8h fino 22: +${Math.round(((contract.overtimeRates?.overtimeNightUntil22 || 1.45) - 1) * 100)}%\n` +
      `• Straord. oltre 8h dopo 22: +${Math.round(((contract.overtimeRates?.overtimeNightAfter22 || 1.5) - 1) * 100)}%\n` +
      `• Notturno festivo: +60%\n\n` +
      `ℹ️ *L'app riconosce automaticamente le ore notturne e applica le maggiorazioni.*`
    );
  }

  _answerLavoroFestivo(settings) {
    const rate = this._getHourlyRate(settings);
    const contract = this._getContract(settings);
    const festivoOrario = rate * (contract.overtimeRates?.holiday || 1.3);
    return (
      `📅 **Lavoro Festivo Ordinario (+${Math.round(((contract.overtimeRates?.holiday || 1.3) - 1) * 100)}%)**\n\n` +
      `Prime 8h in festivo/domenica.\n\n` +
      `**Il tuo calcolo (${this._getContractName(settings)}):**\n` +
      `• Tariffa base: ${this._fmt(rate)}/h\n` +
      `• Festivo +${Math.round(((contract.overtimeRates?.holiday || 1.3) - 1) * 100)}% → **${this._fmt(festivoOrario)}/h**\n\n` +
      `**Differenza:**\n` +
      `• Ordinario (≤8h): +${Math.round(((contract.overtimeRates?.holiday || 1.3) - 1) * 100)}%\n` +
      `• Straordinario (oltre 8h): +50%\n` +
      `• Notturno festivo: +60%`
    );
  }

  // === RISPOSTA FALLBACK - per domande non riconosciute ===

  _answerFallback(originalQuestion) {
    // Estrai le parole significative dalla domanda originale
    const significantWords = this._extractSignificantWords(originalQuestion.toLowerCase());
    
    // Costruisci suggerimenti contestuali basati sulle parole trovate
    let contextualHints = '';
    
    // Tenta di dare un suggerimento basato su parole chiave trovate
    const keywordMap = {
      'ore': 'Puoi chiedere "quanto ho guadagnato" o "riepilogo mese" per vedere le tue ore.',
      'lavoro': 'Puoi chiedere "come inserisco un orario" per registrare le tue ore.',
      'paga': 'Chiedi "qual è la mia tariffa oraria" o "stipendio" per i dettagli retributivi.',
      'giorno': 'Chiedi "tariffa giornaliera" per sapere quanto vale una giornata lavorativa.',
      'mese': 'Chiedi "riepilogo mensile" per il bilancio del mese corrente.',
      'cantiere': 'Chiedi "come funziona il viaggio tra cantieri" per la modalità multi-cantiere.',
      'soldi': 'Chiedi "quanto ho guadagnato" per le statistiche del mese.',
      'guadagno': 'Chiedi "quanto ho guadagnato" per i tuoi guadagni mensili.',
      'calcol': 'Chiedi "metodo di calcolo" per sapere come l\'app calcola le ore.',
      'maggiorazion': 'Chiedi "tariffa oraria" per vedere tutte le maggiorazioni applicate.',
      'straordinari': 'Chiedi "straordinario diurno" o "straordinario serale" per i dettagli.',
      'turno': 'Puoi inserire turni multipli nella stessa giornata da "Inserimento Orario".',
      'impostazion': 'Chiedi "impostazioni generali" per un riepilogo di tutta la configurazione.',
      'notte': 'Chiedi "lavoro notturno" o "straordinario notturno" per le maggiorazioni notturne.',
      'ferie': 'Chiedi "ferie" per sapere come gestire le tue ferie.',
      'permessi': 'Chiedi "permessi" per sapere come gestire i permessi.',
      'reperibilit': 'Chiedi "reperibilità" per tutti i dettagli sulla pronta disponibilità.',
      'viaggio': 'Chiedi "ore di viaggio" per sapere come vengono calcolati gli spostamenti.',
      'pasto': 'Chiedi "rimborsi pasti" per i dettagli su buoni pasto e cash.',
      'netto': 'Chiedi "calcolo netto" per sapere come vengono calcolate le trattenute.',
      'contratto': 'Chiedi "contratto CCNL" per i dettagli sul tuo inquadramento.',
      'assistente': 'Posso aiutarti con: tariffe, maggiorazioni, reperibilità, viaggi, ferie, statistiche, impostazioni e molto altro!',
    };

    // Cerca corrispondenze nelle parole significative
    let matched = false;
    for (const word of significantWords) {
      for (const [key, hint] of Object.entries(keywordMap)) {
        if (word.includes(key) || key.includes(word)) {
          contextualHints = `\n\n💡 **Suggerimento:** ${hint}`;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    return (
      `🤖 **Assistente WorkT**\n\n` +
      `Non sono sicuro di aver capito la tua domanda:\n` +
      `_"${originalQuestion}"_\n\n` +
      `Posso aiutarti con:\n` +
      `• 💰 **Tariffe e retribuzioni** — stipendio, tariffa oraria/giornaliera\n` +
      `• ⏰ **Maggiorazioni** — straordinario, notturno, festivo, serale\n` +
      `• 🟡 **Reperibilità** — indennità, interventi, calendario\n` +
      `• 🚗 **Viaggio e trasferte** — ore di viaggio, indennità trasferta\n` +
      `• 📊 **I tuoi dati** — guadagni, ore lavorate, riepilogo mensile\n` +
      `• ⚙️ **Impostazioni** — contratto, metodo di calcolo, fasce orarie\n` +
      `• 📅 **Ferie e permessi** — gestione assenze\n` +
      `• 🍽️ **Rimborsi pasti** — buoni pasto e cash\n` +
      `• 📖 **Guida** — come usare l'app\n\n` +
      `💡 *Prova a riformulare o scegli una delle opzioni sopra!*` +
      contextualHints
    );
  }

  // === SUGGERIMENTI DINAMICI ===

  _getSuggestions(answeredCategories = []) {
    const allSuggestions = [
      { text: 'Qual è la mia tariffa oraria?', categories: ['TARIFFA_ORARIA'] },
      { text: 'Che contratto ho attivo?', categories: ['CONTRATTO'] },
      { text: 'Come funziona il viaggio tra cantieri?', categories: ['VIAGGIO'] },
      { text: 'Qual è il metodo di calcolo?', categories: ['METODO_CALCOLO'] },
      { text: 'Come funziona la reperibilità?', categories: ['REPERIBILITA'] },
      { text: 'Cosa posso configurare?', categories: ['IMPOSTAZIONI_GENERALI'] },
      { text: 'Quanto ho guadagnato?', categories: ['MIEI_DATI'] },
      { text: 'Riepilogo del mese', categories: ['RIEPILOGO_MENSILE'] },
      { text: 'Come inserisco un orario?', categories: ['INSERIMENTO_ORARIO'] },
      { text: 'Cosa sono le ROL?', categories: ['ROL'] },
      { text: 'Lavoro notturno ordinario', categories: ['LAVORO_NOTTURNO'] },
      { text: 'Indennità trasferta', categories: ['INDENNITA_TRASFERTA'] },
    ];

    const filtered = allSuggestions.filter(s =>
      !s.categories.some(c => answeredCategories.includes(c))
    );
    return filtered.sort(() => Math.random() - 0.5).slice(0, 3).map(s => s.text);
  }
}

export default new AIAssistantService();