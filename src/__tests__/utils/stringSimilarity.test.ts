import { findBestMatch } from "../../../utils/stringSimilarity";

describe('String similarity', () => {
  it('should return the best match', () => {
    const response: any = findBestMatch('hallo', ['hello', 'hell', 'help', 'world']);
    console.log(response);
    expect(response).toBe('hello');
  });

  it('should return null', () => {
    const response: any = findBestMatch('fdfdsffdasfd', ['hello', 'hell', 'help', 'world']);
    expect(response).toBe(null);
  });

  it('should return null if doesnt have a term', () => {
    const response: any = findBestMatch("", ['hello', 'hell', 'help', 'world']);
    expect(response).toBe(null);
  });
});
