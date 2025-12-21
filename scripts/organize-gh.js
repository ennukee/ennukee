import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ESTIMATED_BYTES_PER_LOC = 33;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Loading data.json...');
const jsonPath = path.join(__dirname, '../data/data.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const languageData = data.languageTotals;

const condenseByLanguage = {
  'js/ts': ['javascript', 'typescript'],
  'html/css': ['html', 'css', 'scss', 'less'],
  'c/c++': ['c', 'cpp', 'c++'],
  'python': ['python', 'jupyter notebook'],
}

const condensedData = {};

console.log('Parsing and condensing language data...');
for (const { language, bytes } of languageData) {
  let found = false;
  for (const [condensedLang, langList] of Object.entries(condenseByLanguage)) {
    if (langList.includes(language)) {
      condensedData[condensedLang] = (condensedData[condensedLang] ?? 0) + bytes;
      found = true;
      break;
    }
  }
  if (!found) {
    condensedData[language] = (condensedData[language] ?? 0) + bytes;
  }
}

console.log('Writing condensed data to data_ranked.json...');
const langRanks = Object.fromEntries(Object.entries(condensedData).sort((a, b) => b[1] - a[1]).map(([lang, bytes], index) => [lang, { bytes: Math.round(bytes * 1.3), estimatedLoC: Math.round(1.3 * bytes / ESTIMATED_BYTES_PER_LOC) }]));
fs.writeFileSync(path.join(__dirname, '../display/display/src/assets/data_ranked.json'), JSON.stringify(langRanks, null, 2));
console.log('Done.');
