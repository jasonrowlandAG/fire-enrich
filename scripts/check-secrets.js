#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Patterns to detect. These are intentionally conservative but catch common leaked keys.
const PATTERNS = [
  {name: 'OpenAI key (sk-)', re: /sk-[A-Za-z0-9-_]{20,}/g},
  {name: 'OPENAI_API_KEY or other API_KEY assignments', re: /(?:OPENAI_API_KEY|API_KEY|FIRECRAWL_API_KEY|SECRET_KEY|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*["'`]?[^\s"'`]+/i},
  {name: 'Google service account', re: /"type"\s*:\s*"service_account"/i},
  {name: 'Private key block', re: /-----BEGIN (?:RSA )?PRIVATE KEY-----/i},
  {name: 'Bearer token', re: /Bearer\s+[A-Za-z0-9\-\._~\+\/=]+/i},
  {name: 'AWS access key ID', re: /AKIA[0-9A-Z]{16}/g},
];

function listTrackedFiles() {
  const out = execSync('git ls-files', { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

function shouldSkip(file) {
  const skip = [ '.git/', 'node_modules/', '.next/', '.venv/', 'dist/', 'build/' ];
  return skip.some(s => file.startsWith(s));
}

function scan() {
  const files = listTrackedFiles();
  let found = [];

  for (const file of files) {
    if (shouldSkip(file)) continue;
    const ext = path.extname(file).toLowerCase();
    // Only scan text files roughly
    const textExts = ['.js','.ts','.jsx','.tsx','.json','.env','.md','.txt','.yaml','.yml','.html','.py','.sh'];
    if (!textExts.includes(ext) && ext !== '') continue;

    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (e) {
      continue;
    }

    for (const p of PATTERNS) {
      const re = new RegExp(p.re);
      const m = content.match(re);
      if (m) {
        // filter out obvious placeholders or references to process.env
        const filtered = [];
        for (const match of Array.from(new Set(m))) {
          const idx = content.indexOf(match);
          const start = Math.max(0, idx - 80);
          const line = content.substring(start, Math.min(content.length, idx + match.length + 80));
          const lower = line.toLowerCase();
          if (lower.includes('process.env') || lower.includes('your_') || lower.includes('your') || lower.includes('replace') || lower.includes('example') ) {
            // likely a placeholder or code reference, skip
            continue;
          }
          filtered.push(match);
        }
        if (filtered.length > 0) {
          found.push({ file, pattern: p.name, matches: filtered.slice(0,5) });
        }
      }
    }
  }

  if (found.length > 0) {
    console.error('\nPotential secrets detected in tracked files:\n');
    for (const f of found) {
      console.error(`- ${f.file}: ${f.pattern}`);
      for (const sample of f.matches) {
        console.error(`    sample: ${sample}`);
      }
    }
    console.error('\nIf these are false positives, please confirm. Otherwise rotate the exposed keys immediately and remove them from history.');
    process.exit(1);
  }

  console.log('No likely secrets found in tracked files.');
  process.exit(0);
}

scan();
