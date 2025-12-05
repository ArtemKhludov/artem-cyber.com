const fs = require('fs');
const path = require('path');

// Common contractions and words with apostrophes in JSX text
const apostrophePatterns = [
  // Contractions
  { pattern: /(>)([^<]*?)(don't)([^<]*?)(<)/gi, replacement: '$1$2don&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(can't)([^<]*?)(<)/gi, replacement: '$1$2can&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(won't)([^<]*?)(<)/gi, replacement: '$1$2won&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(isn't)([^<]*?)(<)/gi, replacement: '$1$2isn&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(aren't)([^<]*?)(<)/gi, replacement: '$1$2aren&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(wasn't)([^<]*?)(<)/gi, replacement: '$1$2wasn&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(weren't)([^<]*?)(<)/gi, replacement: '$1$2weren&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(hasn't)([^<]*?)(<)/gi, replacement: '$1$2hasn&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(haven't)([^<]*?)(<)/gi, replacement: '$1$2haven&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(hadn't)([^<]*?)(<)/gi, replacement: '$1$2hadn&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(doesn't)([^<]*?)(<)/gi, replacement: '$1$2doesn&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(didn't)([^<]*?)(<)/gi, replacement: '$1$2didn&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(shouldn't)([^<]*?)(<)/gi, replacement: '$1$2shouldn&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(couldn't)([^<]*?)(<)/gi, replacement: '$1$2couldn&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(wouldn't)([^<]*?)(<)/gi, replacement: '$1$2wouldn&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(mustn't)([^<]*?)(<)/gi, replacement: '$1$2mustn&apos;t$4$5' },
  { pattern: /(>)([^<]*?)(we're)([^<]*?)(<)/gi, replacement: '$1$2we&apos;re$4$5' },
  { pattern: /(>)([^<]*?)(we'll)([^<]*?)(<)/gi, replacement: '$1$2we&apos;ll$4$5' },
  { pattern: /(>)([^<]*?)(we've)([^<]*?)(<)/gi, replacement: '$1$2we&apos;ve$4$5' },
  { pattern: /(>)([^<]*?)(you're)([^<]*?)(<)/gi, replacement: '$1$2you&apos;re$4$5' },
  { pattern: /(>)([^<]*?)(you'll)([^<]*?)(<)/gi, replacement: '$1$2you&apos;ll$4$5' },
  { pattern: /(>)([^<]*?)(you've)([^<]*?)(<)/gi, replacement: '$1$2you&apos;ve$4$5' },
  { pattern: /(>)([^<]*?)(they're)([^<]*?)(<)/gi, replacement: '$1$2they&apos;re$4$5' },
  { pattern: /(>)([^<]*?)(they'll)([^<]*?)(<)/gi, replacement: '$1$2they&apos;ll$4$5' },
  { pattern: /(>)([^<]*?)(they've)([^<]*?)(<)/gi, replacement: '$1$2they&apos;ve$4$5' },
  { pattern: /(>)([^<]*?)(it's)([^<]*?)(<)/gi, replacement: '$1$2it&apos;s$4$5' },
  { pattern: /(>)([^<]*?)(that's)([^<]*?)(<)/gi, replacement: '$1$2that&apos;s$4$5' },
  { pattern: /(>)([^<]*?)(what's)([^<]*?)(<)/gi, replacement: '$1$2what&apos;s$4$5' },
  { pattern: /(>)([^<]*?)(who's)([^<]*?)(<)/gi, replacement: '$1$2who&apos;s$4$5' },
  { pattern: /(>)([^<]*?)(where's)([^<]*?)(<)/gi, replacement: '$1$2where&apos;s$4$5' },
  { pattern: /(>)([^<]*?)(here's)([^<]*?)(<)/gi, replacement: '$1$2here&apos;s$4$5' },
  { pattern: /(>)([^<]*?)(there's)([^<]*?)(<)/gi, replacement: '$1$2there&apos;s$4$5' },
  { pattern: /(>)([^<]*?)(let's)([^<]*?)(<)/gi, replacement: '$1$2let&apos;s$4$5' },
  // Possessives
  { pattern: /(>)([^<]*?)(\w+)'s([^<]*?)(<)/gi, replacement: (match, p1, p2, p3, p4, p5) => {
    // Don't replace if it's already escaped or in a string
    if (p2.includes('&apos;') || p2.includes('&#39;')) return match;
    return p1 + p2 + p3 + '&apos;s' + p4 + p5;
  }},
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Apply patterns
  apostrophePatterns.forEach(({ pattern, replacement }) => {
    const newContent = content.replace(pattern, (match, ...args) => {
      if (typeof replacement === 'function') {
        return replacement(match, ...args);
      }
      return replacement;
    });
    if (newContent !== content) {
      changed = true;
      content = newContent;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

const filesToFix = [
  'app/dashboard/page.tsx',
  'app/disclaimer/page.tsx',
  'app/download/[orderId]/page.tsx',
  'app/terms/page.tsx',
  'components/auth/ExistingAccountModal.tsx',
  'components/auth/UserNotFoundModal.tsx',
  'components/course/CourseContent.tsx',
  'components/dashboard/CallbacksSection.tsx',
  'components/dashboard/ProgressOverview.tsx',
  'components/home/AboutSection.tsx',
  'components/home/Advantages.tsx',
  'components/home/ContactForm.tsx',
  'components/home/Hero.tsx',
  'components/home/ProductCarousel.tsx',
  'components/modals/CallRequestModal.tsx'
];

console.log('Fixing apostrophes in JSX text...\n');

let fixedCount = 0;
filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fixFile(filePath)) {
    console.log(`✓ Fixed ${file}`);
    fixedCount++;
  }
});

console.log(`\n✓ Fixed ${fixedCount} files`);

