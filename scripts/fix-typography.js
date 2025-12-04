const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const TYPOGRAPHIC_CHARS = {
  '\u2019': "'", // right single quotation mark
  '\u2018': "'", // left single quotation mark
  '\u201C': '"', // left double quotation mark
  '\u201D': '"', // right double quotation mark
  '\u2014': '-', // em dash
  '\u2013': '-', // en dash
  '\u2026': '...', // ellipsis
};

async function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const issues = [];

    for (const [typographic, correct] of Object.entries(TYPOGRAPHIC_CHARS)) {
      if (content.includes(typographic)) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(typographic)) {
            issues.push({
              file: filePath,
              line: index + 1,
              char: typographic,
              suggestion: correct,
            });
          }
        });
        content = content.replace(new RegExp(typographic, 'g'), correct);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed ${filePath}`);
      issues.forEach(issue => {
        console.log(`  Line ${issue.line}: Replaced '${issue.char}' with '${issue.suggestion}'`);
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', '.git/**', 'scripts/fix-typography.js'],
  });

  console.log(`Checking ${files.length} files for typographic characters...\n`);

  let fixedCount = 0;
  for (const file of files) {
    if (await fixFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\n✓ Fixed ${fixedCount} files`);
  if (fixedCount === 0) {
    console.log('No typographic characters found.');
  }
}

main().catch(console.error);

