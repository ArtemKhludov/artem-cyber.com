const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files with errors
const filesToFix = [
  'app/auth/login/page.tsx',
  'app/book/page.tsx',
  'app/checkout/page.tsx',
  'app/checkout/success/page.tsx',
  'app/contacts/page.tsx',
  'app/dashboard/page.tsx',
  'app/disclaimer/page.tsx',
  'app/download/[orderId]/page.tsx',
  'app/terms/page.tsx',
  'components/auth/ExistingAccountModal.tsx',
  'components/auth/UserNotFoundModal.tsx',
  'components/course/CourseContent.tsx',
  'components/dashboard/UserIssuesList.tsx',
  'components/home/AboutSection.tsx',
  'components/home/ContactForm.tsx',
  'components/home/Hero.tsx',
  'components/home/ProductCarousel.tsx',
  'components/pdf/PDFPreview.tsx'
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace apostrophes in JSX text content (not in strings)
  // Match apostrophes that are in JSX text nodes (between > and <)
  const apostropheRegex = /(>)([^<]*?)(['])([^<]*?)(<)/g;
  const newContent = content.replace(apostropheRegex, (match, before, text1, apostrophe, text2, after) => {
    // Only replace if it's not already escaped and not in a string literal
    if (!text1.includes('&apos;') && !text1.includes('&#39;') && !text1.includes('&rsquo;')) {
      changed = true;
      return before + text1 + '&apos;' + text2 + after;
    }
    return match;
  });

  // Also replace standalone apostrophes in JSX text
  // This is a simpler approach - replace apostrophes that appear to be in JSX text
  const lines = content.split('\n');
  const newLines = lines.map((line, index) => {
    // Skip if line contains string literals (quotes)
    if (line.includes("'") && (line.includes("='") || line.includes('="') || line.includes(":'") || line.includes(':"'))) {
      return line;
    }
    
    // Replace apostrophes in JSX text (between > and <)
    if (line.includes(">") && line.includes("<") && line.includes("'")) {
      const fixed = line.replace(/([>][^<]*?)(['])([^<]*?[<])/g, (match, before, apostrophe, after) => {
        // Check if it's in a JSX text node
        if (!before.includes('&apos;') && !before.includes('&#39;')) {
          changed = true;
          return before + '&apos;' + after;
        }
        return match;
      });
      return fixed;
    }
    return line;
  });

  if (changed) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    return true;
  }

  return false;
}

// Manual fixes for specific files
const manualFixes = {
  'app/auth/login/page.tsx': (content) => {
    // Fix line 414
    return content.replace(/(don't|can't|won't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|didn't|shouldn't|couldn't|wouldn't|mustn't)/g, (match) => {
      return match.replace("'", '&apos;');
    });
  }
};

console.log('Fixing unescaped entities in JSX...\n');

let fixedCount = 0;
filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fixFile(filePath)) {
    console.log(`✓ Fixed ${file}`);
    fixedCount++;
  }
});

console.log(`\n✓ Fixed ${fixedCount} files`);
console.log('\n⚠️  Note: Some files may need manual review for complex cases.');

