import { env } from '../config/env.js';

const BEGIN = '-----BEGIN PRIVATE KEY-----';
const END = '-----END PRIVATE KEY-----';

function asciiCode(character) {
  if (!character) return null;
  const code = character.charCodeAt(0);
  return code <= 127 ? code : null;
}

function characterCodes(value) {
  return [...value].map(asciiCode);
}

function safePreview(value) {
  const beginToken = '\u0001';
  const endToken = '\u0002';
  const newlineToken = '\u0003';
  return value
    .replaceAll(BEGIN, beginToken)
    .replaceAll(END, endToken)
    .replaceAll('\\n', newlineToken)
    .replace(/[A-Za-z0-9+/=]/g, '*')
    .replaceAll(beginToken, BEGIN)
    .replaceAll(endToken, END)
    .replaceAll(newlineToken, '\\n');
}

export function getGooglePrivateKeyDiagnostics() {
  const original = process.env.GOOGLE_PRIVATE_KEY;
  const raw = typeof original === 'string' ? original : '';
  const normalized = env.googlePrivateKey;
  const first = raw.slice(0, 20);
  const last = raw.slice(-20);

  return {
    typeofProcessEnvGooglePrivateKey: typeof original,
    originalLength: raw.length,
    normalizedLength: normalized.length,
    length: raw.length,
    startsWithBegin: raw.startsWith(BEGIN),
    endsWithEnd: raw.endsWith(END),
    containsLiteralSlashN: raw.includes('\\n'),
    containsRealNewline: raw.includes('\n'),
    containsCarriageReturn: raw.includes('\r'),
    containsDoubleQuote: raw.includes('"'),
    startsWithQuote: raw.startsWith('"'),
    endsWithQuote: raw.endsWith('"'),
    startsWithWhitespace: /^\s/.test(raw),
    endsWithWhitespace: /\s$/.test(raw),
    firstCharacterCode: asciiCode(raw[0]),
    lastCharacterCode: asciiCode(raw.at(-1)),
    first20CharacterCodes: characterCodes(first),
    last20CharacterCodes: characterCodes(last),
    previewStart: safePreview(raw.slice(0, 40)),
    previewEnd: safePreview(raw.slice(-40))
  };
}
