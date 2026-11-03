export function maskPersonalData(value) {
  return String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
    .replace(/(?<![\w])\+?\d[\d\s().-]{7,}\d(?![\w])/g, (match) => (match.match(/\d/g)?.length >= 9 ? '[PHONE]' : match));
}
