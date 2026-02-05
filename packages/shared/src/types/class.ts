/**
 * Age category within a class
 */
export interface Category {
  /** Internal database ID */
  id: number;
  /** Category code (e.g., ZS, ZM, ZD) */
  catId: string;
  /** Display name */
  name: string;
  /** Youngest birth year in category */
  firstYear: number | null;
  /** Oldest birth year in category */
  lastYear: number | null;
}

/**
 * Race class (boat type + gender + categories)
 */
export interface Class {
  /** Internal database ID */
  id: number;
  /** C123 ClassId (e.g., K1M-ZS) */
  classId: string;
  /** Short name */
  name: string;
  /** Full display name */
  longTitle: string | null;
  /** Age categories within this class */
  categories?: Category[];
}

/**
 * Class data for creation
 */
export interface ClassCreate {
  classId: string;
  name: string;
  longTitle?: string | null;
  categories?: CategoryCreate[];
}

/**
 * Category data for creation
 */
export interface CategoryCreate {
  catId: string;
  name: string;
  firstYear?: number | null;
  lastYear?: number | null;
}
