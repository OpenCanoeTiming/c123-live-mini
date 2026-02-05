import type { XmlCourse, ParsedCourse } from './types.js';

/**
 * Ensure value is an array
 */
function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Parse required number from string or number
 */
function parseRequiredInt(value: string | number): number {
  const num = typeof value === 'string' ? parseInt(value.trim(), 10) : value;
  if (isNaN(num)) {
    throw new Error(`Invalid number value: ${value}`);
  }
  return num;
}

/**
 * Count gates from course config string
 * Config format: "NNRNSNNRNSRNNNSRNNNSRRNS"
 * N = Normal gate, R = Reverse gate, S = Separator
 */
function countGates(config: string | undefined): number | null {
  if (!config) return null;
  // Count N and R characters (actual gates)
  return (config.match(/[NR]/g) || []).length;
}

/**
 * Normalize gate config - keep only N, R, remove separators
 */
function normalizeGateConfig(config: string | undefined): string | null {
  if (!config) return null;
  // Keep only N and R characters
  const normalized = config.replace(/[^NR]/g, '');
  return normalized.length > 0 ? normalized : null;
}

/**
 * Parse CourseData section from XML
 */
export function parseCourseData(
  courses: XmlCourse | XmlCourse[] | undefined
): ParsedCourse[] {
  const courseArray = ensureArray(courses);

  return courseArray.map((c) => ({
    courseNr: parseRequiredInt(c.CourseNr),
    nrGates: countGates(c.CourseConfig),
    gateConfig: normalizeGateConfig(c.CourseConfig),
  }));
}
