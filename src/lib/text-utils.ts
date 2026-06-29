/**
 * Detect if text contains Arabic characters.
 * Used to apply dir="rtl" / text-align: right for Arabic content.
 */
export function isArabic(text: string | null | undefined): boolean {
  if (!text) return false;
  // Arabic Unicode block U+0600-U+06FF, also includes Arabic Supplement U+0750-U+077F
  // and Arabic Presentation Forms U+FB50-U+FDFF, U+FE70-U+FEFF
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  // If more than 30% of chars are Arabic (after stripping digits/punct), it's Arabic
  const totalChars = (text.match(/[\w\u0600-\u06FF]/g) || []).length;
  if (totalChars === 0) return false;
  return arabicChars / totalChars >= 0.3;
}

/**
 * Detect direction (rtl or ltr) for a text.
 */
export function getDirection(text: string | null | undefined): 'rtl' | 'ltr' {
  return isArabic(text) ? 'rtl' : 'ltr';
}

/**
 * Get language code (ar, fr, en) based on text content.
 */
export function detectLanguage(text: string | null | undefined): 'ar' | 'fr' | 'en' {
  if (!text) return 'fr';
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const latinChars = (text.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  if (arabicChars === 0 && latinChars === 0) return 'fr';
  // If at least 30% Arabic → ar
  if (arabicChars / (arabicChars + latinChars) >= 0.3) return 'ar';
  return 'fr';
}
