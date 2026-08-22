import { SHEETS, synchronizeGoogleSheets } from '../server/services/googleSheets.js';

const result = await synchronizeGoogleSheets({ removeUnused: false });
const invalid = result.filter(({ title, headers }) => {
  return !SHEETS[title] || headers.length !== SHEETS[title].length || headers.some((header, index) => header !== SHEETS[title][index]);
});

if (invalid.length) throw new Error(`Schema verification failed for: ${invalid.map(({ title }) => title).join(', ')}.`);
console.log(`Google Sheets synchronized: ${result.length} sheets, ${invalid.length} schema errors.`);
