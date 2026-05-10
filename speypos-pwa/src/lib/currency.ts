import { useSettings } from '@/contexts/SettingsContext';

// Currency metadata matching backend MoneyService
interface CurrencyMetadata {
  code: string;
  symbol: string;
  minorUnit: number; // decimal places (2 for USD, 0 for KHR)
  position: 'before' | 'after';
}

const CURRENCIES: Record<string, CurrencyMetadata> = {
  USD: { code: 'USD', symbol: '$', minorUnit: 2, position: 'before' },
  KHR: { code: 'KHR', symbol: '៛', minorUnit: 0, position: 'after' },
  EUR: { code: 'EUR', symbol: '€', minorUnit: 2, position: 'before' },
  GBP: { code: 'GBP', symbol: '£', minorUnit: 2, position: 'before' },
  THB: { code: 'THB', symbol: '฿', minorUnit: 2, position: 'before' },
};

// Realistic banknote denominations by currency (in display units)
const DENOMINATIONS: Record<string, number[]> = {
  USD: [1, 5, 10, 20, 50, 100],
  KHR: [1000, 2000, 5000, 10000, 20000, 50000, 100000],
  EUR: [5, 10, 20, 50, 100],
  GBP: [5, 10, 20, 50],
  THB: [20, 50, 100, 500, 1000],
};

// Rounding rules by currency (in display units)
const ROUNDING_RULES: Record<string, number> = {
  USD: 1,       // Round to nearest whole dollar
  KHR: 5000,    // Round to nearest 5,000 KHR
  EUR: 1,       // Round to nearest whole euro
  GBP: 1,       // Round to nearest whole pound
  THB: 10,      // Round to nearest 10 baht
};

function getCurrencyMetadata(currencyCode: string): CurrencyMetadata {
  return CURRENCIES[currencyCode] || CURRENCIES.USD;
}

/**
 * Get the minor unit (decimal places) for a currency
 */
export function getMinorUnit(currencyCode: string = 'USD'): number {
  return getCurrencyMetadata(currencyCode).minorUnit;
}

/**
 * Get the multiplier for converting between display and stored values
 */
function getMultiplier(currencyCode: string): number {
  return Math.pow(10, getMinorUnit(currencyCode));
}

/**
 * Normalize user input to integer smallest units (mirrors backend MoneyService.normalizeInput)
 * @param amount - User-friendly value (e.g., 12.50 for USD, 5000 for KHR)
 * @param currencyCode - Currency code
 * @returns Integer in smallest units
 */
export function normalizeInput(amount: number, currencyCode: string = 'USD'): number {
  const multiplier = getMultiplier(currencyCode);
  return Math.round(amount * multiplier);
}

/**
 * Format integer smallest units to display string (mirrors backend MoneyService.format)
 * @param integerAmount - Price in smallest units (e.g., 1250 for $12.50)
 * @param currencyCode - Currency code
 * @returns Formatted string (e.g., "$12.50")
 */
export function format(integerAmount: number, currencyCode: string = 'USD'): string {
  const metadata = getCurrencyMetadata(currencyCode);
  const multiplier = getMultiplier(currencyCode);
  const displayValue = integerAmount / multiplier;
  
  // Format with thousand separators for KHR
  let formattedValue: string;
  if (metadata.minorUnit === 0) {
    formattedValue = displayValue.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else {
    formattedValue = displayValue.toFixed(metadata.minorUnit);
  }
  
  if (metadata.position === 'before') {
    return `${metadata.symbol}${formattedValue}`;
  } else {
    return `${formattedValue}${metadata.symbol}`;
  }
}

/**
 * Convert stored integer back to user-friendly value for form inputs
 * @param integerAmount - Price in smallest units
 * @param currencyCode - Currency code
 * @returns Display value as string for input fields
 */
export function toDisplayValue(integerAmount: number, currencyCode: string = 'USD'): string {
  const metadata = getCurrencyMetadata(currencyCode);
  const multiplier = getMultiplier(currencyCode);
  const value = integerAmount / multiplier;
  return metadata.minorUnit === 0 ? value.toString() : value.toFixed(metadata.minorUnit);
}

/**
 * Get the currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  return getCurrencyMetadata(currencyCode).symbol;
}

/**
 * Generate quick payment amounts based on realistic banknote denominations
 * @param totalInSmallestUnits - Total amount in smallest currency units (cents, riel, etc.)
 * @param currencyCode - Currency code
 * @returns Array of quick amounts in smallest units (up to 4 values)
 */
export function generateQuickAmounts(
  totalInSmallestUnits: number,
  currencyCode: string = 'USD'
): number[] {
  const multiplier = getMultiplier(currencyCode);
  const denominations = DENOMINATIONS[currencyCode] || DENOMINATIONS.USD;
  const roundingUnit = ROUNDING_RULES[currencyCode] || 1;

  // Convert to display units
  const totalDisplay = totalInSmallestUnits / multiplier;

  // Step 1: Round UP to nearest rounding unit
  const roundedUp = Math.ceil(totalDisplay / roundingUnit) * roundingUnit;

  // Step 2: Find banknotes >= rounded value
  const validNotes = denominations.filter(note => note >= roundedUp);

  // Step 3: Build result - start with rounded value if it's not a denomination and differs from total
  const result: number[] = [];

  // Include the rounded-up value as first option (if it differs from total and isn't a denomination)
  if (roundedUp > totalDisplay && !denominations.includes(roundedUp)) {
    result.push(roundedUp);
  }

  // Add next available denominations
  for (const note of validNotes) {
    if (!result.includes(note)) {
      result.push(note);
    }
    if (result.length >= 4) break;
  }

  // Convert back to smallest units
  return result.map(amount => normalizeInput(amount, currencyCode));
}

/**
 * Hook for currency formatting using the current currency from settings
 * Mirrors backend MoneyService API
 */
export function useCurrency() {
  const { getCurrency } = useSettings();
  const currency = getCurrency();
  const metadata = getCurrencyMetadata(currency);

  return {
    // MoneyService-aligned functions
    normalizeInput: (amount: number) => normalizeInput(amount, currency),
    format: (integerAmount: number) => format(integerAmount, currency),
    toDisplayValue: (integerAmount: number) => toDisplayValue(integerAmount, currency),
    
    // Metadata helpers
    getMinorUnit: () => metadata.minorUnit,
    symbol: metadata.symbol,
    code: currency,
    
    // Quick amounts for payment
    generateQuickAmounts: (totalInSmallestUnits: number) => 
      generateQuickAmounts(totalInSmallestUnits, currency),
    
    // Legacy aliases for backward compatibility
    formatPrice: (integerAmount: number) => format(integerAmount, currency),
    formatAmount: (amount: number) => {
      // Format a display value (not smallest units) with symbol
      const formattedValue = metadata.minorUnit === 0 
        ? amount.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : amount.toFixed(metadata.minorUnit);
      return metadata.position === 'before' 
        ? `${metadata.symbol}${formattedValue}` 
        : `${formattedValue}${metadata.symbol}`;
    },
  };
}

// Legacy exports for backward compatibility
export const CURRENCY_SYMBOL = '$';
export const CURRENCY_CODE = 'USD';
