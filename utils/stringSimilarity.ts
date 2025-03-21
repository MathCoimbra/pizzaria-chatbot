import stringSimilarity from 'string-similarity';

export function findBestMatch(term: string, list: string[], threshold: number = 0.5): string | null {
  if (term) {
    const { bestMatch } = stringSimilarity.findBestMatch(term, list);
    if (bestMatch.rating >= threshold) {
      return bestMatch.target;
    }
  }
  return null;
}