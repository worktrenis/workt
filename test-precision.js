const preciseCalculate = (operation, value1, value2) => {
  const cents1 = Math.round(value1 * 100);
  const cents2 = Math.round(value2 * 100);
  
  let resultCents;
  switch (operation) {
    case 'multiply':
      resultCents = Math.round(cents1 * cents2 / 100);
      break;
    case 'add':
      resultCents = cents1 + cents2;
      break;
    case 'subtract':
      resultCents = cents1 - cents2;
      break;
    case 'divide':
      resultCents = Math.round(cents1 / cents2 * 100);
      break;
    default:
      throw new Error(`Operazione non supportata: ${operation}`);
  }
  
  return Math.round(resultCents) / 100;
};

console.log('🧮 Test calcolo preciso:');
console.log('20.72 × 3 (JavaScript normale):', 20.72 * 3);
console.log('20.72 × 3 (preciseCalculate):', preciseCalculate('multiply', 20.72, 3));
console.log('');
console.log('Altri test:');
console.log('16.15 × 3 (JavaScript normale):', 16.15 * 3);
console.log('16.15 × 3 (preciseCalculate):', preciseCalculate('multiply', 16.15, 3));
console.log('');
console.log('20.72 × 1.25 (JavaScript normale):', 20.72 * 1.25);
console.log('20.72 × 1.25 (preciseCalculate):', preciseCalculate('multiply', 20.72, 1.25));
