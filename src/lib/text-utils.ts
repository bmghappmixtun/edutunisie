

/**
 * Get initials for a name, handling parentheses and special chars.
 * Returns 2-letter uppercase initials, skipping non-letter characters.
 *
 * Examples:
 *   getInitials('TunisieCollège', '(source originale)') → 'TC'
 *   getInitials('GHARBI', 'RIDHA') → 'GR'
 *   getInitials('محمّد', 'بن معلّم') → 'مب' (or 'MB')
 *   getInitials('A', 'B') → 'AB'
 */
export function getInitials(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const getFirstLetter = (s: string | null | undefined): string => {
    if (!s) return '';
    // Find first alphabetic character (Unicode letters)
    const match = s.match(/[\p{L}]/u);
    return match ? match[0] : '';
  };
  
  const f = getFirstLetter(firstName);
  const l = getFirstLetter(lastName);
  return (f + l).toUpperCase();
}
