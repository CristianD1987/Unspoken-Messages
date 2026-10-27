/**
 * Generates client/src/content/legalDocuments.ts from docs/*.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TERMS_PATH = path.join(ROOT, 'docs', 'terms.md');
const PRIVACY_PATH = path.join(ROOT, 'docs', 'privacy-policy.md');
const OUT_PATH = path.join(ROOT, 'client', 'src', 'content', 'legalDocuments.ts');

function readMarkdown(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`sync-legal: missing ${label} at ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').trimEnd() + '\n';
}

function main() {
  const terms = readMarkdown(TERMS_PATH, 'terms.md');
  const privacy = readMarkdown(PRIVACY_PATH, 'privacy-policy.md');

  const header = `/** GENERATED — do not edit by hand.
 *  Source of truth: docs/terms.md, docs/privacy-policy.md
 *  Regenerate: node scripts/sync-legal.js (also runs on prestart / typecheck / EAS pre-install)
 */

`;

  const body = `${header}export const TERMS_OF_USE_MARKDOWN = ${JSON.stringify(terms)};

export const PRIVACY_POLICY_MARKDOWN = ${JSON.stringify(privacy)};
`;

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, body, 'utf8');
  console.log('sync-legal: wrote', path.relative(ROOT, OUT_PATH));
}

main();
