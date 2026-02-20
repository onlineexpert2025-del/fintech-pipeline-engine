/**
 * OCR Service for GoalPulse
 * Uses ONLY on-device ML Kit (@react-native-ml-kit/text-recognition)
 * No cloud APIs, no external dependencies
 */

import { Platform } from 'react-native';

import * as FileSystem from 'expo-file-system';

// Import ML Kit
let TextRecognition: any = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
  console.log('[OCR] ML Kit loaded successfully');
} catch (e) {
  console.error('[OCR] ML Kit not available:', e);
}

export interface OCRResult {
  text: string;
  lines: string[];
}

export interface ParsedReceipt {
  merchantName?: string;
  totalAmount?: number;
  date?: string;
  rawText: string;
  lines: string[];
}

/**
 * Ensure URI is accessible to ML Kit
 * - If content://, copy to cache
 * - If file:// but possibly restricted, copy to cache
 */
const ensureAccessibleUri = async (uri: string): Promise<string> => {
  try {
    if (Platform.OS === 'web') return uri;

    console.log('[OCR] 🔍 Checking URI accessibility:', uri);

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      console.warn('[OCR] ⚠️ Source file does not exist or is not accessible:', uri);
      // Don't return yet, maybe ML Kit can still read it if FileSystem can't (rare)
    } else {
      console.log(`[OCR] 📁 File stats: size=${fileInfo.size}, isDirectory=${fileInfo.isDirectory}`);
    }

    // If it's a content URI or not in our sandbox, copy it to cache
    // This ensures ML Kit has direct file access
    const isContentUri = uri.startsWith('content://');
    const isInCache = uri.startsWith(FileSystem.cacheDirectory || 'INVALID');
    const isInDoc = uri.startsWith(FileSystem.documentDirectory || 'INVALID');

    if (isContentUri || (!isInCache && !isInDoc)) {
      const fileName = `ocr_temp_${Date.now()}.jpg`;
      const destPath = `${FileSystem.cacheDirectory}${fileName}`;

      console.log('[OCR] 🔄 Normalizing input URI to cache:', destPath);
      await FileSystem.copyAsync({
        from: uri,
        to: destPath
      });

      return destPath;
    }

    return uri;
  } catch (e) {
    console.error('[OCR] ❌ Failed to normalize URI:', e);
    return uri; // Fail safe
  }
};

/**
 * Main OCR function - uses ONLY ML Kit
 * @param imageUri - Local file URI of the image
 * @returns OCRResult with extracted text
 */
export const performMLKitOCR = async (imageUri: string): Promise<OCRResult> => {
  console.log('[OCR] ==================== START OCR ====================');
  console.log('[OCR] Platform:', Platform.OS);
  console.log('[OCR] Image URI:', imageUri);

  // Validate input
  if (!imageUri || imageUri.trim().length === 0) {
    console.log('[OCR] ❌ Invalid image URI');
    return { text: '', lines: [] };
  }

  // Web platform - ML Kit not available
  if (Platform.OS === 'web') {
    console.log('[OCR] ⚠️ Web platform - ML Kit not available, user must enter manually');
    return { text: '', lines: [] };
  }

  // Check if ML Kit is available
  if (!TextRecognition) {
    console.error('[OCR] ❌ ML Kit not installed');
    return { text: '', lines: [] };
  }

  try {
    console.log('[OCR] 📱 Using ML Kit for OCR...');

    // Pass URI directly to ML Kit (works for both camera and gallery)
    // SAFEGUARD: Normalize URI first (handle content:// etc)
    const processedUri = await ensureAccessibleUri(imageUri);

    console.log('[OCR] 📱 Final URI passed to ML Kit:', processedUri);



    console.log('[OCR] 📱 Running ML Kit recognition...');
    const result = await TextRecognition.recognize(processedUri);

    if (result && result.text && result.text.trim().length > 0) {
      const lines = result.text.split('\n').filter((line: string) => line.trim().length > 0);
      console.log('[OCR] ✅ ML Kit SUCCESS!');
      console.log('[OCR] 📄 Text length:', result.text.length);
      console.log('[OCR] 📄 Lines detected:', lines.length);
      console.log('[OCR] 📄 Preview:', result.text.substring(0, 200));
      console.log('[OCR] ==================== END OCR ====================');
      return { text: result.text, lines };
    } else {
      console.log('[OCR] ⚠️ ML Kit returned empty text');
      console.log('[OCR] ==================== END OCR ====================');
      return { text: '', lines: [] };
    }
  } catch (error: any) {
    console.error('[OCR] ❌ ML Kit error:', error?.message || error);
    console.log('[OCR] ==================== END OCR ====================');
    return { text: '', lines: [] };
  }
};

/**
 * Generate mock OCR data for web demo/testing purposes ONLY
 * This should NOT be used in production - users enter data manually
 */
export const performMockOCR = (): OCRResult => {
  // Return empty - user enters data manually
  return {
    text: '',
    lines: [],
  };
};

/**
 * Parse receipt data from OCR text
 * STRICT LOGIC: Find "Total" by LABEL, NOT by largest number
 * Cash/Change amounts are often higher than the actual total!
 */
export const parseReceiptData = (ocrResult: OCRResult): ParsedReceipt => {
  const { text, lines } = ocrResult;

  // If no text extracted, return empty (user enters manually)
  if (!text || text.trim().length === 0) {
    return {
      merchantName: undefined,
      totalAmount: undefined,
      date: undefined,
      rawText: '',
      lines: [],
    };
  }

  let merchantName: string | undefined;
  let totalAmount: number | undefined;

  console.log('[OCR Parse] ===== STRICT LABEL-BASED PARSING =====');
  console.log('[OCR Parse] Lines:', lines.length);

  // ============================================
  // RULE 1: Merchant = First line with letters (not numbers/symbols only)
  // ============================================
  for (const line of lines) {
    // Skip lines that are mostly numbers/symbols
    if (/^[\d\s\-\.\/:,]+$/.test(line)) continue;

    // Skip lines that are just dates
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) continue;

    // Must have at least 3 letters
    if ((line.match(/[A-Za-z]/g) || []).length >= 3) {
      merchantName = line.trim();
      console.log('[OCR Parse] ✅ Store:', merchantName);
      break;
    }
  }

  // ============================================
  // RULE 2: Total = Find by LABEL, NOT largest number
  // CRITICAL: Exclude Cash, Change, Tender, Balance lines!
  // ============================================

  // Words that indicate this line is NOT the total we want
  const EXCLUDE_KEYWORDS = /\b(cash|change|tendered|tender|balance due|amount tendered|tip|savings|you saved|member|reward|coupon|discount|subtotal|sub total|tax only|hst|gst|credit|debit|visa|mastercard|amex|discover|payment|paid)\b/i;

  // Words that indicate this IS the total line  
  const TOTAL_KEYWORDS = /\b(total|grand total|total due|amount due|total sale|sale total|order total)\b/i;

  // First pass: Find lines with "TOTAL" label (most reliable)
  console.log('[OCR Parse] 🔍 Searching for labeled Total...');

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Must contain "total" keyword
    if (!TOTAL_KEYWORDS.test(lowerLine)) continue;

    // Must NOT contain excluded keywords (skip "Total Savings", "Subtotal", etc)
    if (EXCLUDE_KEYWORDS.test(lowerLine)) {
      console.log('[OCR Parse] ⏭️ Skipping (excluded):', line);
      continue;
    }

    // Skip if it's clearly NOT the real total
    if (/subtotal|sub\s*total|total\s*savings|total\s*tax/i.test(lowerLine)) {
      console.log('[OCR Parse] ⏭️ Skipping (subtotal/savings):', line);
      continue;
    }

    // Extract ANY dollar amount from this line
    const amountMatch = line.match(/\$?\s*([\d,]+\.\d{2})/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0 && amount < 10000) {
        totalAmount = amount;
        console.log('[OCR Parse] ✅ TOTAL FOUND:', totalAmount, '← from:', line);
        break;
      }
    }
  }

  // Second pass: If no total found, try "Amount Due" or "Balance"
  if (!totalAmount) {
    console.log('[OCR Parse] 🔍 Trying Amount Due / Balance...');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (/amount\s*due|balance\s*=|you\s*owe/i.test(lowerLine)) {
        // Skip "Change Due" or "Balance Due" (that's what they owe you)
        if (/change/i.test(lowerLine)) continue;

        const amountMatch = line.match(/\$?\s*([\d,]+\.\d{2})/);
        if (amountMatch) {
          const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
          if (!isNaN(amount) && amount > 0 && amount < 10000) {
            totalAmount = amount;
            console.log('[OCR Parse] ✅ Amount Due found:', totalAmount);
            break;
          }
        }
      }
    }
  }

  // LAST RESORT: Find amounts but STRICTLY exclude Cash/Change lines
  if (!totalAmount) {
    console.log('[OCR Parse] ⚠️ No labeled total, using filtered fallback...');
    const bottomHalf = lines.slice(Math.floor(lines.length * 0.5));
    let candidates: { amount: number; line: string }[] = [];

    for (const line of bottomHalf) {
      const lowerLine = line.toLowerCase();

      // STRICT: Skip ANY line with cash, change, tender
      if (/cash|change|tender|paid|payment/i.test(lowerLine)) {
        console.log('[OCR Parse] ⏭️ Fallback skip:', line);
        continue;
      }

      const amounts = line.match(/\$?\s*([\d,]+\.\d{2})/g);
      if (amounts) {
        for (const amt of amounts) {
          const value = parseFloat(amt.replace(/[$,\s]/g, ''));
          if (value > 0 && value < 10000) {
            candidates.push({ amount: value, line });
          }
        }
      }
    }

    // Pick the SECOND largest (total is usually not the largest - cash is)
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.amount - a.amount);
      // If there are multiple, skip the largest (likely Cash)
      const pick = candidates.length > 1 ? candidates[1] : candidates[0];
      totalAmount = pick.amount;
      console.log('[OCR Parse] ✅ Fallback total:', totalAmount, '← from:', pick.line);
    }
  }

  console.log('[OCR Parse] ===== RESULT =====');
  console.log('[OCR Parse] Store:', merchantName || 'NOT FOUND');
  console.log('[OCR Parse] Total:', totalAmount || 'NOT FOUND');

  return {
    merchantName,
    totalAmount,
    date: undefined,
    rawText: text,
    lines,
  };
};
