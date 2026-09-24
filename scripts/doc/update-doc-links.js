const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const root = process.cwd();

// Define replacements: from -> to
const replacements = [
  // wiki
  { from: /(?!docs\/wiki\/)(wiki\/)/g, to: 'docs/wiki/' },
  // test-output
  { from: /(?!docs\/test-output\/)(test-output\/)/g, to: 'docs/test-output/' },
  // snapshots diffs
  { from: /(?!docs\/snapshots\/diffs\/)(snapshots\/diffs\/)/g, to: 'docs/snapshots/diffs/' },
  // snapshots repo_snapshots
  { from: /(?!docs\/snapshots\/repo_snapshots\/)(snapshots\/repo_snapshots\/)/g, to: 'docs/snapshots/repo_snapshots/' },
];

function processFile(filepath) {
  let content = readFileSync(filepath, 'utf8');
  let original = content;
  for (const { from, to } of replacements) {
    content = content.replace(from, to);
  }
  if (content !== original) {
    writeFileSync(filepath, content, 'utf8');
    console.log(`Updated links in ${filepath}`);
  }
}

// Walk through all .md files in repo (excluding node_modules, .git)
function walk(dir, callback) {
  const entries = require('fs').readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'docs') {
        // skip node_modules, .git, and we will process docs separately maybe
        continue;
      }
      walk(full, callback);
    } else if (entry.name.endsWith('.md')) {
      callback(full);
    }
  }
}

// Process all markdown files
walk(root, processFile);

// Also process files inside docs (they may have links to each other)
walk(join(root, 'docs'), processFile);

console.log('Link update completed.');