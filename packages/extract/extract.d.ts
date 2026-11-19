export interface Extracted {
  url: string;
  title: string;
  /** Candidate photos, best first: the person picks one. https only. */
  images: string[];
  /** Ready to show, e.g. "$39.95". */
  price: string;
  currency: string;
  site: string;
}

export interface AmazonListItem {
  id: string;
  asin: string;
  title: string;
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
export const version: number;
