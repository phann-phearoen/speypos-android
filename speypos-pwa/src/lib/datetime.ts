import { useSettings } from '@/contexts/SettingsContext';

// Default timezone for the application
const DEFAULT_TIMEZONE = 'Asia/Phnom_Penh';

/**
 * Format a timestamp to date string: dd-MM-yyyy
 * @param timestamp - Unix timestamp in milliseconds or Date object
 * @param timezone - IANA timezone string
 * @returns Formatted date string (e.g., "19-01-2026")
 */
export function formatDate(
  timestamp: number | Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;

  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: timezone,
  });

  return formatter.format(date);
}

/**
 * Format a timestamp to time string: 12-hour format with AM/PM
 * @param timestamp - Unix timestamp in milliseconds or Date object
 * @param timezone - IANA timezone string
 * @param includeSeconds - Whether to include seconds
 * @returns Formatted time string (e.g., "10:30 AM")
 */
export function formatTime(
  timestamp: number | Date,
  timezone: string = DEFAULT_TIMEZONE,
  includeSeconds: boolean = false
): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;

  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  };

  if (includeSeconds) {
    options.second = '2-digit';
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format a timestamp to full datetime: dd-MM-yyyy hh:mm AM/PM
 * @param timestamp - Unix timestamp in milliseconds or Date object
 * @param timezone - IANA timezone string
 * @returns Formatted datetime string
 */
export function formatDateTime(
  timestamp: number | Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return `${formatDate(timestamp, timezone)} ${formatTime(timestamp, timezone)}`;
}

/**
 * Format a date string (yyyy-MM-dd) to display format (dd-MM-yyyy)
 * Used for backend's shift.date property
 */
export function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
}

/**
 * Get today's date in yyyy-MM-dd format for a given timezone
 * Useful for comparing with shift.date
 */
export function getTodayDateString(timezone: string = DEFAULT_TIMEZONE): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });
  return formatter.format(now); // Returns yyyy-MM-dd format
}

/**
 * Get a date's string in yyyy-MM-dd format for API calls
 */
export function getDateString(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });
  return formatter.format(date);
}

/**
 * Format a short date with weekday for headers
 * e.g., "Mon, Jan 19"
 */
export function formatShortDate(
  timestamp: number | Date,
  timezone: string = DEFAULT_TIMEZONE,
  locale: string = 'en-US'
): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;

  return new Intl.DateTimeFormat(locale === 'km' ? 'km-KH' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(date);
}

/**
 * Format a long date for display
 * e.g., "January 19, 2026" or "Jan 19, 2026"
 */
export function formatLongDate(
  timestamp: number | Date,
  timezone: string = DEFAULT_TIMEZONE,
  short: boolean = false
): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;

  return new Intl.DateTimeFormat('en-GB', {
    month: short ? 'short' : 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(date);
}

/**
 * Format a time range (e.g., for shift display)
 * e.g., "10:30 AM - 6:45 PM" or "10:30 AM - Ongoing"
 */
export function formatTimeRange(
  startTimestamp: number,
  endTimestamp: number | null,
  timezone: string = DEFAULT_TIMEZONE,
  ongoingLabel: string = 'Ongoing'
): string {
  const start = formatTime(startTimestamp, timezone);
  const end = endTimestamp ? formatTime(endTimestamp, timezone) : ongoingLabel;
  return `${start} - ${end}`;
}

/**
 * Hook for datetime formatting using the store's timezone
 * Mirrors the useCurrency pattern
 */
export function useDateTime() {
  const { getTimezone, getLanguage } = useSettings();
  const timezone = getTimezone();
  const language = getLanguage();

  return {
    // Core formatters
    formatDate: (timestamp: number | Date) => formatDate(timestamp, timezone),
    formatTime: (timestamp: number | Date, includeSeconds: boolean = false) =>
      formatTime(timestamp, timezone, includeSeconds),
    formatDateTime: (timestamp: number | Date) => formatDateTime(timestamp, timezone),

    // Specialized formatters
    formatDateString: formatDateString,
    formatShortDate: (timestamp: number | Date) => formatShortDate(timestamp, timezone, language),
    formatLongDate: (timestamp: number | Date, short: boolean = false) => 
      formatLongDate(timestamp, timezone, short),
    formatTimeRange: (start: number, end: number | null, ongoingLabel: string = 'Ongoing') =>
      formatTimeRange(start, end, timezone, ongoingLabel),

    // Utilities
    getTodayDateString: () => getTodayDateString(timezone),
    getDateString: (date: Date) => getDateString(date, timezone),

    // Metadata
    timezone,
    language,
  };
}
