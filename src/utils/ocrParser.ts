export interface ParsedReceipt {
  store: string;
  total: number;
  subtotal?: number;
  tax?: number;
  items: string[];
  date?: string;
}

export const parseReceiptText = (text: string): ParsedReceipt | null => {
  if (!text || text.trim().length < 5) return null;

  // Normalize text: fix common OCR errors
  const normalizedText = text
    .replace(/[|l]/g, (match, offset, str) => {
      // Replace | or l with 1 only if surrounded by digits
      const before = str[offset - 1];
      const after = str[offset + 1];
      if (/\d/.test(before) || /\d/.test(after)) return '1';
      return match;
    })
    .replace(/[oO](?=\d)/g, '0')  // O before digit -> 0
    .replace(/(?<=\d)[oO]/g, '0') // O after digit -> 0
    .replace(/\s+/g, ' ')
    .replace(/\$ /g, '$');

  const lines = normalizedText.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);

  let store = '';
  let total = 0;
  let subtotal: number | undefined;
  let tax: number | undefined;
  let items: string[] = [];
  let date: string | undefined;

  // ===== STORE NAME EXTRACTION =====
  // Usually the first 1-3 lines contain the store name
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Skip lines that look like addresses, phone numbers, dates
    if (/^\d{1,5}\s/.test(line)) continue; // Address starting with number
    if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)) continue; // Phone number
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) continue; // Date
    if (/^(store|receipt|transaction|order)/i.test(line)) continue;
    
    if (line.length >= 3 && line.length <= 50) {
      store = line.replace(/[#*=\-_]+/g, '').trim();
      break;
    }
  }

  // ===== DATE EXTRACTION =====
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (dateMatch) {
      date = dateMatch[1];
      break;
    }
  }

  // ===== TOTAL EXTRACTION (Most Important) =====
  // STRICT RULE: "Total" must be identified by LABEL, not by largest number
  // Patterns that specifically look for "TOTAL" keyword
  const totalPatterns = [
    /(?:^|\s)(?:grand\s*)?total\s*[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    /(?:^|\s)total\s*(?:sale|due|amount)?\s*[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    /\$\s*([\d,]+\.\d{2})\s*total/i,
  ];

  // CRITICAL: Lines to IGNORE - these are NEVER the total
  // Cash/Change amounts are often HIGHER than the total!
  const ignoreForTotal = /cash|change\s*due|change\s*given|change\b|balance|amount\s*tendered|tendered|tip|crv|subtotal|sub\s*total|tax|credit|debit|visa|mastercard|amex|discover|tender|paid\s*with|payment|savings|you\s*saved|member|reward|coupon|discount/i;

  // Search from bottom up (total usually at bottom)
  const reversedLines = [...lines].reverse();
  
  for (const line of reversedLines) {
    const lowerLine = line.toLowerCase();
    
    // SKIP lines that are clearly not total (CASH, CHANGE, etc.)
    if (ignoreForTotal.test(lowerLine)) {
      // But capture subtotal if we find it
      if (/subtotal|sub\s*total/i.test(lowerLine)) {
        const subMatch = line.match(/([\d,]+\.?\d{0,2})\s*$/);
        if (subMatch && !subtotal) {
          subtotal = parseFloat(subMatch[1].replace(/,/g, ''));
        }
      }
      continue;
    }

    // PRIORITIZE lines with "TOTAL" keyword
    if (/\btotal\b/i.test(lowerLine)) {
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const value = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(value) && value > 0 && value < 10000) {
            total = value;
            break;
          }
        }
      }
      if (total > 0) break;
    }
  }

  // Secondary pass: Look for "amount due" or "balance due" if no total found
  if (!total) {
    for (const line of reversedLines) {
      const lowerLine = line.toLowerCase();
      
      // Skip ignored terms
      if (ignoreForTotal.test(lowerLine)) continue;
      
      // Look for amount/balance due
      if (/amount\s*due|balance\s*due/i.test(lowerLine)) {
        const match = line.match(/\$?\s*([\d,]+\.?\d{0,2})/);
        if (match) {
          const value = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(value) && value > 0 && value < 10000) {
            total = value;
            break;
          }
        }
      }
    }
  }

  // Fallback: Look for the largest amount in the bottom third (but still skip ignored terms)
  if (!total) {
    const bottomThird = lines.slice(Math.floor(lines.length * 0.6));
    let maxAmount = 0;
    
    for (const line of bottomThird) {
      // Skip lines with terms that are NOT totals
      if (ignoreForTotal.test(line.toLowerCase())) continue;
      
      const amounts = line.match(/\$?\s*([\d,]+\.\d{2})/g);
      if (amounts) {
        for (const amt of amounts) {
          const value = parseFloat(amt.replace(/[$,\s]/g, ''));
          if (value > maxAmount && value < 10000) {
            maxAmount = value;
          }
        }
      }
    }
    
    if (maxAmount > 0) total = maxAmount;
  }

  // ===== TAX EXTRACTION =====
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (/\b(tax|hst|gst|pst|vat)\b/i.test(lowerLine) && !/total/i.test(lowerLine)) {
      const taxMatch = line.match(/([\d,]+\.?\d{0,2})\s*$/);
      if (taxMatch) {
        const value = parseFloat(taxMatch[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0 && value < total) {
          tax = value;
          break;
        }
      }
    }
  }

  // ===== SUBTOTAL EXTRACTION (if not found above) =====
  if (!subtotal) {
    for (const line of lines) {
      if (/subtotal|sub\s*total/i.test(line)) {
        const subMatch = line.match(/([\d,]+\.?\d{0,2})\s*$/);
        if (subMatch) {
          const value = parseFloat(subMatch[1].replace(/,/g, ''));
          if (!isNaN(value) && value > 0) {
            subtotal = value;
            break;
          }
        }
      }
    }
  }

  // ===== ITEMS EXTRACTION =====
  const skipKeywords = /^(total|subtotal|sub total|tax|hst|gst|change|cash|credit|debit|visa|mastercard|tender|paid|balance|amount|discount|coupon|savings|you saved|member|reward|store|receipt|transaction|thank|welcome|card|xxxx|\*\*\*)/i;
  const pricePattern = /\$?\s*\d+\.\d{2}/;

  for (const line of lines) {
    // Skip short lines
    if (line.length < 5) continue;
    
    // Skip lines matching skip keywords
    if (skipKeywords.test(line.trim())) continue;
    
    // Skip lines that are just numbers or special chars
    if (/^[\d\s\.\$\-\*#=]+$/.test(line)) continue;
    
    // Include lines that have a price
    if (pricePattern.test(line)) {
      // Clean up the item line
      const cleanedLine = line
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      if (cleanedLine.length > 3) {
        items.push(cleanedLine);
      }
    }
  }

  // Limit items
  items = items.slice(0, 20);

  // Return null only if we couldn't find any meaningful data
  if (!total && !store && items.length === 0) {
    return null;
  }

  return {
    store: store || 'Unknown Store',
    total: total || 0,
    subtotal,
    tax,
    items,
    date,
  };
};

// Helper to categorize receipt based on content
export const categorizeReceipt = (text: string, items: string[]): string => {
  const lowerText = (text + ' ' + items.join(' ')).toLowerCase();
  
  // Check items first for better accuracy
  const itemsText = items.join(' ').toLowerCase();
  
  // Alcohol & Tobacco (check FIRST before fuel - gas stations sell these too)
  if (/beer|vodka|whiskey|whisky|fireball|wine|alcohol|liquor|rum|gin|tequila|cig|cigarette|tobacco|juul|vape/i.test(itemsText)) {
    return 'food'; // Using 'food' category for alcohol/tobacco purchases
  }
  
  // Food & Dining
  if (/restaurant|cafe|coffee|starbucks|mcdonald|burger|pizza|taco|sandwich|food|dine|eat|meal/i.test(lowerText)) {
    return 'food';
  }
  
  // Groceries
  if (/grocery|supermarket|walmart|target|kroger|safeway|whole foods|trader joe|produce|vegetable|fruit|milk|bread|meat/i.test(lowerText)) {
    return 'groceries';
  }
  
  // Gas/Fuel (ONLY if actual fuel items detected, not just store name)
  const hasFuelItems = /\bfuel\b|\bgas\b|pump|unleaded|diesel|gallon|octane|premium|regular|grade/i.test(itemsText);
  const isFuelStore = /shell|exxon|mobil|chevron|bp|petrol|conoco|arco|sunoco|marathon/i.test(lowerText);
  
  if (hasFuelItems || (isFuelStore && !/beer|vodka|whiskey|fireball|wine|cig|cigarette/i.test(itemsText))) {
    return 'fuel';
  }
  
  // Entertainment
  if (/movie|cinema|theatre|concert|ticket|game|entertainment|netflix|spotify/i.test(lowerText)) {
    return 'entertainment';
  }
  
  // Health
  if (/pharmacy|cvs|walgreens|medicine|prescription|health|medical|doctor/i.test(lowerText)) {
    return 'health';
  }
  
  // Transportation
  if (/uber|lyft|taxi|parking|transit|metro|bus|train/i.test(lowerText)) {
    return 'transport';
  }
  
  // Utilities
  if (/electric|water|gas bill|internet|phone|utility|power/i.test(lowerText)) {
    return 'utilities';
  }
  
  return 'shopping';
};
