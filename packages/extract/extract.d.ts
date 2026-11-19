export interface Extracted {
  url: string;
  title: string;
  /** Candidate photos, best first: the person picks one. https only. */
  images: string[];
  /** Ready to show, e.g. "$39.95". */
  price: string;
  currency: string;
  site: string;
  /** The page looks like one product (not a cart, a list or a home page). */
  product: boolean;
  /** The size, color and so on chosen on the page (or given by the product's data). */
  options: { name: string; value: string }[];
  /** The options as one line for Notes: "Size: L · Color: Navy". */
  notes: string;
  /** The shop's whole title; `title` is shortened to the part before the first break. */
  fullTitle: string;
}

export interface AmazonListItem {
  id: string;
  asin: string;
  title: string;
  fullTitle: string;
  url: string;
  image: string;
  price: string;
  /** Marked "highest" priority on Amazon: becomes Really want. */
  highest: boolean;
  notes: string;
}

export interface AmazonList {
  name: string;
  url: string;
  items: AmazonListItem[];
  /** The end of the list has loaded. */
  complete: boolean;
}

export function extract(doc: Document, url?: string): Extracted;
export function readAmazonList(doc: Document, url?: string): AmazonList;
export function formatPrice(price: string, currency?: string): string;
export function shortTitle(title: string, max?: number): string;
export const version: number;
