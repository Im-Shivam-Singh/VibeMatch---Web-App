import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a party's location without duplicating the city name.
 * Seed data stores area as "Neighbourhood, City" — appending city again
 * would produce "Neighbourhood, City, City".
 */
export function formatLocation(area: string | null | undefined, city: string | null | undefined): string {
  const a = (area ?? "").trim();
  const c = (city ?? "").trim();
  if (!a && !c) return "";
  if (!a) return c;
  if (!c) return a;
  // If area already ends with the city, skip the duplicate
  if (a.endsWith(`, ${c}`) || a.endsWith(`,${c}`)) return a;
  return `${a}, ${c}`;
}
