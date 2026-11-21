import i18n from './index';

/**
 * Format an amount as currency using the active locale
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a number using the active locale
 * @param value - The number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(i18n.language, options).format(value);
}

/**
 * Format a date using the active locale
 * @param date - The date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(i18n.language, options).format(dateObj);
}

/**
 * Format a date as a short date string (e.g., "12/25/2023" or "25/12/2023")
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDateShort(date: Date | string | number): string {
  return formatDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format a date with full information (e.g., "December 25, 2023, 10:30 AM")
 * @param date - The date to format
 * @returns Formatted date string with time
 */
export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
