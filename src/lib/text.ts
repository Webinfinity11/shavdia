/**
 * Georgian capitals (Mtavruli), for labels the design sets in capitals.
 * CSS text-transform does not change Georgian letters, so the text itself is converted.
 */
export function caps(text: string) {
  return text.toUpperCase();
}
