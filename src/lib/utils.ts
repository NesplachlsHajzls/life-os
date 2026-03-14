import { clsx, type ClassValue } from 'clsx'

// Spojí Tailwind třídy — použití: cn('text-sm', isActive && 'font-bold')
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Formátuje číslo jako měnu: 4200 → "4 200 Kč"
export function formatCurrency(amount: number, currency = 'CZK'): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Formátuje datum: 2026-03-10 → "10. 3. 2026"
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

// Formátuje datum kratce: "10. 3."
export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
  }).format(new Date(date))
}
