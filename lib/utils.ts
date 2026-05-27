import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as EUR currency
 * @param amount - The amount to format
 * @returns Formatted EUR string (e.g., "1.234,56 €")
 */
export function formatEUR(amount: number): string {
  return amount.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

