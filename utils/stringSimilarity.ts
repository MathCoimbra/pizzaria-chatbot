import stringSimilarity from 'string-similarity';

export function findBestMatch(term: string, list: string[], threshold: number = 0.5): string | null {
  if (term) {
    const lowerTerm = term.toLowerCase();
    const lowerList = list.map(item => item.toLowerCase());
    const { bestMatch } = stringSimilarity.findBestMatch(lowerTerm, lowerList);
    if (bestMatch.rating >= threshold) {
      // Retorna o valor original da lista, não o lowercase
      const matchedIndex = lowerList.indexOf(bestMatch.target);
      return list[matchedIndex];
    }
  }
  return null;
}