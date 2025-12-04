const fs = require('fs');
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

async function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
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
            code: line.trim().substring(0, 100), // First 100 chars of line
          });
        }
      });
    }
  }

  return issues;
}

async function main() {
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', '.git/**'],
  });

  console.log(`Checking ${files.length} files for typographic characters...\n`);

  const allIssues = [];
  for (const file of files) {
    const issues = await checkFile(file);
    allIssues.push(...issues);
  }

  if (allIssues.length > 0) {
    console.log('❌ Found typographic characters in code:\n');
    allIssues.forEach(issue => {
      console.log(`${issue.file}:${issue.line}`);
      console.log(`  Found: '${issue.char}' should be '${issue.suggestion}'`);
      console.log(`  Code: ${issue.code}`);
      console.log('');
    });
    process.exit(1);
  } else {
    console.log('✓ No typographic characters found');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

