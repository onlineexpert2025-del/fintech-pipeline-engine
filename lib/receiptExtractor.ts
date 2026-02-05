/**
 * Extract Total, Date, and Store from OCR text using regex.
 * Total: largest number with decimal (e.g. 55.83)
 * Date: MM/DD/YYYY, YYYY-MM-DD, or similar. Fallback to today.
 * Store: first few words or placeholder if not found.
 */
export interface ExtractedReceipt {
  total: number;
  date: string;
  store: string;
}

export function extractFromReceiptText(text: string): ExtractedReceipt {
  const total = extractTotal(text);
  const date = extractDate(text);
  const store = extractStore(text);

  return { total, date, store };
}

function extractTotal(text: string): number {
  // Match numbers with 2 decimal places (currency format)
  const matches = text.match(/\$?\s*(\d{1,8}\.\d{2})\b/g);
  if (!matches || matches.length === 0) return 0;

  const values = matches.map((m) => parseFloat(m.replace(/[$\s]/g, '')));
  return Math.max(...values);
}

function extractDate(text: string): string {
  const today = new Date();

  // MM/DD/YYYY or M/D/YYYY
  const usDate = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usDate) {
    const [, m, d, y] = usDate;
    const month = m.padStart(2, '0');
    const day = d.padStart(2, '0');
    return `${y}-${month}-${day}`;
  }

  // YYYY-MM-DD
  const isoDate = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return isoDate[0];

  // DD.MM.YYYY
  const euDate = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (euDate) {
    const [, d, m, y] = euDate;
    const month = m.padStart(2, '0');
    const day = d.padStart(2, '0');
    return `${y}-${month}-${day}`;
  }

  // Month names: Jan 4, Feb 04, February 4 2026
  const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const textLower = text.toLowerCase();
  for (let i = 0; i < monthNames.length; i++) {
    const regex = new RegExp(`(${monthNames[i]})\\w*\\s+(\\d{1,2})(?:,\\s*)?(\\d{4})?`, 'i');
    const m = text.match(regex);
    if (m) {
      const month = String(i + 1).padStart(2, '0');
      const day = m[2].padStart(2, '0');
      const year = m[3] || String(today.getFullYear());
      return `${year}-${month}-${day}`;
    }
  }

  return today.toISOString().slice(0, 10);
}

function extractStore(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // First non-empty line often is store name; avoid lines that look like headers
  const skipPatterns = /^(total|subtotal|tax|date|time|reprint|prepaid|receipt)\s*$/i;
  for (const line of lines.slice(0, 8)) {
    const t = line.trim();
    if (t.length >= 2 && t.length <= 40 && !skipPatterns.test(t) && !/^\d+\.?\d*$/.test(t)) {
      return t.slice(0, 50);
    }
  }
  return 'Unknown';
}
