import type { XmlClass, XmlCategory, ParsedClass, ParsedCategory } from './types.js';

/**
 * Ensure value is an array
 */
function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Parse optional number from string or number
 */
function parseOptionalInt(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(num) ? null : num;
}

/**
 * Parse a single category
 */
function parseCategory(cat: XmlCategory): ParsedCategory {
  return {
    catId: cat.CatId,
    name: cat.Category,
    firstYear: parseOptionalInt(cat.FirstYear),
    lastYear: parseOptionalInt(cat.LastYear),
  };
}

/**
 * Parse Classes section from XML
 */
export function parseClasses(
  classes: XmlClass | XmlClass[] | undefined
): ParsedClass[] {
  const classArray = ensureArray(classes);

  return classArray.map((cls) => ({
    classId: cls.ClassId,
    name: cls.Class,
    longTitle: cls.LongTitle || null,
    categories: ensureArray(cls.Categories).map(parseCategory),
  }));
}
