import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names, resolving conflicts via `tailwind-merge` and
 * supporting all `clsx` input forms (strings, arrays, objects, etc.).
 *
 * @param inputs - Any number of class-value expressions accepted by `clsx`.
 * @returns A single deduplicated, conflict-resolved class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
