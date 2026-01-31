// Date and time utilities
export const formatDate = (date, format = 'dd/MM/yyyy') => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'dd/MM':
      return `${day}/${month}`;
    case 'MMM yyyy':
      return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    default:
      return d.toLocaleDateString('it-IT');
  }
};

// Funzione di utilità per convertire stringhe numeriche con virgola o punto in float
export const parseNumericValue = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  // Converte in stringa se non lo è già
  const stringValue = String(value);
  
  // Sostituisce virgola con punto per il parsing
  const cleanValue = stringValue.replace(',', '.');
  
  // Parsing del valore
  const numValue = parseFloat(cleanValue);
  
  // Ritorna il valore di default se il parsing fallisce
  return isNaN(numValue) ? defaultValue : numValue;
};

export const formatTime = (time) => {
  if (!time) return '';
  // Ensure format HH:MM
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

export const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Formatta ore e minuti in modo sicuro
export const formatSafeHours = (hours) => {
  if (hours === undefined || hours === null) return '0:00';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
};

// Calcola la differenza di tempo in ore
export const getTimeDifference = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  
  // Converte le stringhe in oggetti Date per calcolo corretto
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  // Differenza in millisecondi
  const diff = endDate.getTime() - startDate.getTime();
  
  // Converti in ore (millisecondi / 1000 / 60 / 60)
  return diff / 3600000;
};

// Parsifica una stringa oraria
export const parseTime = (timeString) => {
  if (!timeString) return null;
  
  if (typeof timeString === 'string') {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }
  
  return null
};

export const getCurrentTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

export const getMonthName = (monthNumber) => {
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  return months[monthNumber - 1];
};

export const getDayName = (date) => {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const d = new Date(date);
  return days[d.getDay()];
};

export const isWeekend = (date) => {
  const d = new Date(date);
  return d.getDay() === 0 || d.getDay() === 6; // Sunday = 0, Saturday = 6
};

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
};

export const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month - 1, 1).toISOString().split('T')[0];
};

export const getLastDayOfMonth = (year, month) => {
  return new Date(year, month, 0).toISOString().split('T')[0];
};

export const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

// Number formatting utilities
export const formatCurrency = (amount, currency = '') => {
  if (amount === null || amount === undefined) return currency ? `0,00 ${currency}` : '0,00';
  
  // Formattazione standard italiana con separatore migliaia
  const formattedAmount = amount
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return currency ? `${formattedAmount} ${currency}` : formattedAmount;
};

export const formatHours = (hours) => {
  if (hours === null || hours === undefined) return '0:00';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
};

export const parseHours = (hoursString) => {
  if (!hoursString) return 0;
  const [hours, minutes] = hoursString.split(':').map(Number);
  return hours + (minutes / 60);
};

// Validation utilities
export const isValidTime = (timeString) => {
  if (!timeString) return true; // Empty is valid
  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timePattern.test(timeString);
};

export const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

export const validateWorkEntry = (entry) => {
  const errors = {};
  
  if (!entry.date) {
    errors.date = 'Data obbligatoria';
  } else if (!isValidDate(entry.date)) {
    errors.date = 'Data non valida';
  }
  
  // Validate time formats
  const timeFields = [
    'departureCompany', 'arrivalSite', 'workStart1', 'workEnd1',
    'workStart2', 'workEnd2', 'departureReturn', 'arrivalCompany',
    'standbyDeparture', 'standbyArrival', 'standbyWorkStart1', 'standbyWorkEnd1',
    'standbyWorkStart2', 'standbyWorkEnd2', 'standbyReturnDeparture', 'standbyReturnArrival'
  ];
  
  timeFields.forEach(field => {
    if (entry[field] && !isValidTime(entry[field])) {
      errors[field] = 'Formato orario non valido (HH:MM)';
    }
  });
  
  // Helper function to convert time string to minutes for comparison
  const timeToMinutes = (timeString) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to check if end time is after start time (considering midnight crossing)
  const isValidTimeRange = (startTime, endTime) => {
    if (!startTime || !endTime) return true;
    
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    
    // If end time is smaller than start time, assume it crosses midnight (night shift)
    // Any time range that crosses midnight is valid (e.g., 20:00-04:00, 23:00-06:00, etc.)
    if (end < start) {
      return true; // Always valid when crossing midnight
    }
    
    // Regular shift: end must be after start
    return end > start;
  };

  // Check logical consistency
  if (entry.workStart1 && entry.workEnd1) {
    if (!isValidTimeRange(entry.workStart1, entry.workEnd1)) {
      errors.workEnd1 = 'Orario fine deve essere successivo all\'inizio';
    }
  }
  
  if (entry.workStart2 && entry.workEnd2) {
    if (!isValidTimeRange(entry.workStart2, entry.workEnd2)) {
      errors.workEnd2 = 'Orario fine deve essere successivo all\'inizio';
    }
  }
  
  // Check sequence between shifts (handle midnight crossing properly)
  if (entry.workEnd1 && entry.workStart2) {
    const start1 = timeToMinutes(entry.workStart1 || '00:00');
    const end1 = timeToMinutes(entry.workEnd1);
    const start2 = timeToMinutes(entry.workStart2);
    
    // Check if first shift crosses midnight
    const firstShiftCrossesMidnight = end1 < start1;
    
    if (firstShiftCrossesMidnight) {
      // First shift crosses midnight (e.g., 20:00-04:00)
      // Second shift can start either:
      // 1. After the end time if it's in the morning (same "day")
      // 2. Later in the evening for another night shift
      if (start2 <= end1 && start2 < 720) { // start2 is early morning (before noon)
        // Second shift starts in morning but before first shift ends
        errors.workStart2 = 'Secondo turno deve iniziare dopo la fine del primo';
      }
      // If start2 is in the afternoon/evening, it's automatically valid
    } else {
      // Regular case: first shift doesn't cross midnight
      if (start2 <= end1) {
        errors.workStart2 = 'Secondo turno deve iniziare dopo la fine del primo';
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Color utilities for UI
export const getStatusColor = (status) => {
  const colors = {
    completed: '#4CAF50',
    pending: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    warning: '#FFC107'
  };
  return colors[status] || colors.info;
};

export const getStandbyDayColor = () => '#E1F5FE'; // Light blue for standby days

// Data transformation utilities
export const groupByMonth = (entries) => {
  return entries.reduce((groups, entry) => {
    const monthKey = entry.date.substring(0, 7); // YYYY-MM
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(entry);
    return groups;
  }, {});
};

export const groupByWeek = (entries) => {
  return entries.reduce((groups, entry) => {
    const date = new Date(entry.date);
    const week = getWeekNumber(date);
    const weekKey = `${date.getFullYear()}-W${week}`;
    if (!groups[weekKey]) {
      groups[weekKey] = [];
    }
    groups[weekKey].push(entry);
    return groups;
  }, {});
};

export const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Device utilities
export const isTablet = (screenWidth) => {
  return screenWidth >= 768;
};

// Storage utilities
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return defaultValue;
  }
};

export const safeJsonStringify = (object, defaultValue = '{}') => {
  try {
    return JSON.stringify(object);
  } catch (error) {
    console.warn('Failed to stringify object:', error);
    return defaultValue;
  }
};
