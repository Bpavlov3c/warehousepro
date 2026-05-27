import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as EUR currency
 * Consistent formatting to avoid server/client hydration mismatches
 * @param amount - The amount to format
 * @returns Formatted EUR string (e.g., "1.234,56 €")
 */
export function formatEUR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0,00 €'
  }
  
  // Manual formatting to ensure consistency between server and client
  const rounded = Math.round(amount * 100) / 100
  const isNegative = rounded < 0
  const absAmount = Math.abs(rounded)
  
  const parts = absAmount.toFixed(2).split('.')
  const intPart = parts[0]
  const decPart = parts[1]
  
  // Add thousand separators with dots
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  const formatted = `${withSeparators},${decPart} €`
  return isNegative ? `-${formatted}` : formatted
}

