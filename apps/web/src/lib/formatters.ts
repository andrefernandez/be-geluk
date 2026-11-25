/**
 * Converte nomes de empresas e clientes para Capital Letter (Title Case / Capitalize),
 * evitando caixa alta (UPPERCASE) indesejada.
 * Ex: "CENTRO AUTOMOTIVO RODRIGO MARQUES LTDA" -> "Centro Automotivo Rodrigo Marques Ltda"
 */
export function formatCapitalLetter(str: string | null | undefined): string {
  if (!str) return '';
  const trimmed = str.trim();
  if (!trimmed) return '';

  const shortAcronyms = new Set(['PL', 'DJ', 'MK', '4S', 'VK', 'WLC', 'JCP', 'MHF', 'AZ', 'GH', 'JD', 'LH', 'MR', 'SM', 'VMR']);
  if (shortAcronyms.has(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }

  const lowercaseWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'por', 'a', 'o', 'as', 'os']);
  const specialWords: Record<string, string> = {
    'ltda': 'Ltda',
    'ltda.': 'Ltda.',
    'me': 'ME',
    'epp': 'EPP',
    'eireli': 'Eireli',
    'sa': 'S/A',
    's/a': 'S/A',
    's.a.': 'S.A.',
    's.a': 'S.A.'
  };

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return '';
      const lower = word.toLowerCase();
      if (specialWords[lower]) return specialWords[lower];
      if (shortAcronyms.has(word.toUpperCase())) return word.toUpperCase();
      if (index > 0 && lowercaseWords.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
