import crypto from 'crypto';
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

function count(value, pattern) {
  return (value.match(pattern) || []).length;
}

function classify(character) {
  if (character === undefined) return 'missing';
  if (character === '\n') return 'newline';
  if (character === '\r') return 'carriage-return';
  if (character === '\\') return 'backslash';
  if (character === '"') return 'double-quote';
  if (/\s/.test(character)) return 'whitespace';
  if (/[A-Za-z0-9+/=]/.test(character)) return 'PEM/base64-character';
  return 'punctuation';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function firstDifference(expected, actual) {
  const length = Math.max(expected.length, actual.length);
  for (let index = 0; index < length; index += 1) {
    if (expected[index] === actual[index]) continue;
    return {
      index,
      expectedAscii: asciiCode(expected[index]),
      actualAscii: asciiCode(actual[index]),
      expectedClassification: classify(expected[index]),
      actualClassification: classify(actual[index])
    };
  }
  return null;
}

function metrics(value) {
  return {
    sha256: sha256(value),
    length: value.length,
    backslashCount: count(value, /\\/g),
    literalSlashNCount: count(value, /\\n/g),
    doubleEscapedSlashNCount: count(value, /\\\\n/g),
    realNewlineCount: count(value, /\n/g),
    carriageReturnCount: count(value, /\r/g),
    doubleQuoteCount: count(value, /"/g),
    headerDetected: value.startsWith(BEGIN),
    footerDetected: value.includes(END)
  };
}

function pemStructure(value) {
  const bodyStart = value.indexOf(BEGIN) + BEGIN.length;
  const footerIndex = value.indexOf(END);
  const body = bodyStart >= BEGIN.length && footerIndex >= bodyStart ? value.slice(bodyStart, footerIndex).replace(/\s/g, '') : '';
  return {
    beginsAtIndexZero: value.startsWith(BEGIN),
    hasWhitespaceBeforeHeader: /^\s/.test(value),
    hasBom: value.charCodeAt(0) === 0xFEFF,
    hasCarriageReturn: value.includes('\r'),
    footerIndex,
    endsAtFooter: value.endsWith(END),
    exactlyOneNewlineAfterFooter: value.endsWith(`${END}\n`) && !value.endsWith(`${END}\n\n`),
    bodyPresent: body.length > 0,
    bodyContainsOnlyBase64: body.length > 0 && /^[A-Za-z0-9+/=]+$/.test(body)
  };
}

export function getGooglePrivateKeyParseDiagnostics(key = env.googlePrivateKey) {
  const structuralExpected = key.replace(/\\(?=\n)/g, '');
  let parser = { valid: true };
  try {
    crypto.createPrivateKey(key);
  } catch (error) {
    parser = { valid: false, code: error.code, reason: error.reason, library: error.library, opensslErrorStack: error.opensslErrorStack };
  }
  return { normalized: metrics(key), pemStructure: pemStructure(key), firstStructuralDifference: firstDifference(structuralExpected, key), parser };
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
  const original = env.googlePrivateKeyOriginal;
  const raw = typeof original === 'string' ? original : '';
  const normalized = env.googlePrivateKey;
  const first = raw.slice(0, 20);
  const last = raw.slice(-20);

  return {
    typeofProcessEnvGooglePrivateKey: typeof original,
    googleCredentialsSource: env.googleCredentialsSource,
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
    previewEnd: safePreview(raw.slice(-40)),
    original: metrics(raw),
    ...getGooglePrivateKeyParseDiagnostics(normalized)
  };
}
