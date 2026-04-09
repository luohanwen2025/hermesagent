/**
 * Hermes Agent Official Docs Sync Script
 *
 * This script fetches the latest documentation from the official Hermes Agent
 * GitHub repository and reports changes, helping you keep the site content up-to-date.
 *
 * Usage:
 *   node scripts/sync-docs.mjs              # Check for updates
 *   node scripts/sync-docs.mjs --download   # Download changed files
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE_FILE = join(ROOT, '.sync-cache.json');
const DOWNLOAD_DIR = join(ROOT, 'synced-docs');

const REPO = 'NousResearch/hermes-agent';
const BRANCH = 'main';
const DOCS_PATH = 'docs';

// Key files to monitor from the official repo
const MONITORED_FILES = [
  'docs/README.md',
  'docs/quickstart.md',
  'docs/installation.md',
  'docs/cli-usage.md',
  'docs/configuration.md',
  'docs/gateway.md',
  'docs/memory.md',
  'docs/skills.md',
  'docs/cron.md',
  'docs/tools.md',
  'docs/security.md',
  'docs/mcp.md',
  'docs/architecture.md',
  'README.md',
];

function getGitHubToken() {
  return process.env.GITHUB_TOKEN || '';
}

async function fetchFromGitHub(path) {
  const token = getGitHubToken();
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data.map(item => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      type: item.type,
    }));
  }
  return {
    name: data.name,
    path: data.path,
    sha: data.sha,
    content: data.content ? Buffer.from(data.content, 'base64').toString('utf-8') : null,
  };
}

async function getLatestCommitSHA() {
  const token = getGitHubToken();
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (token) headers['Authorization'] = `token ${token}`;

  const url = `https://api.github.com/repos/${REPO}/commits?sha=${BRANCH}&per_page=1`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch commits: ${response.status}`);
  }

  const commits = await response.json();
  return commits[0]?.sha || null;
}

function loadCache() {
  if (existsSync(CACHE_FILE)) {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  }
  return { lastSync: null, commitSha: null, fileShas: {} };
}

function saveCache(cache) {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function checkForUpdates() {
  console.log('🔍 Checking for updates from Hermes Agent official repo...\n');

  const cache = loadCache();
  const latestSha = await getLatestCommitSHA();

  if (!latestSha) {
    console.error('❌ Could not fetch latest commit SHA. Check your network connection.');
    process.exit(1);
  }

  console.log(`   Latest commit: ${latestSha.substring(0, 8)}`);
  console.log(`   Last synced:   ${cache.commitSha ? cache.commitSha.substring(0, 8) : 'never'}\n`);

  if (cache.commitSha === latestSha) {
    console.log('✅ Already up to date! No changes detected.\n');
    return [];
  }

  const changes = [];

  for (const filePath of MONITORED_FILES) {
    try {
      const data = await fetchFromGitHub(filePath);
      if (!data.sha) continue;

      const cached = cache.fileShas[filePath];
      if (!cached) {
        changes.push({ path: filePath, status: 'new' });
      } else if (cached !== data.sha) {
        changes.push({ path: filePath, status: 'modified' });
      }
    } catch (e) {
      // File might not exist, skip
    }
  }

  if (changes.length === 0) {
    console.log('ℹ️  New commits detected but no changes in monitored doc files.\n');
  } else {
    console.log(`📝 ${changes.length} file(s) changed:\n`);
    for (const change of changes) {
      const icon = change.status === 'new' ? '🆕' : '✏️';
      console.log(`   ${icon} ${change.path}`);
    }
    console.log('');
  }

  return changes;
}

async function downloadChanges(changes) {
  if (changes.length === 0) return;

  if (!existsSync(DOWNLOAD_DIR)) {
    mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const cache = loadCache();

  console.log('📥 Downloading changed files...\n');

  for (const change of changes) {
    try {
      const data = await fetchFromGitHub(change.path);
      if (!data.content) continue;

      const localPath = join(DOWNLOAD_DIR, change.path.replace('docs/', ''));
      const localDir = dirname(localPath);
      if (!existsSync(localDir)) {
        mkdirSync(localDir, { recursive: true });
      }

      writeFileSync(localPath, data.content);
      cache.fileShas[change.path] = data.sha;

      console.log(`   ✅ Downloaded: ${change.path} → ${localPath}`);
    } catch (e) {
      console.error(`   ❌ Failed: ${change.path} — ${e.message}`);
    }
  }

  const latestSha = await getLatestCommitSHA();
  cache.commitSha = latestSha;
  cache.lastSync = new Date().toISOString();
  saveCache(cache);

  console.log('\n✅ Sync complete! Files saved to synced-docs/ directory.');
  console.log('💡 Review the changes and update the site content accordingly.\n');
}

// Main
const args = process.argv.slice(2);
const shouldDownload = args.includes('--download');

try {
  const changes = await checkForUpdates();
  if (shouldDownload && changes.length > 0) {
    await downloadChanges(changes);
  } else if (changes.length > 0) {
    console.log('💡 Run with --download flag to download changed files:');
    console.log('   node scripts/sync-docs.mjs --download\n');
  }
} catch (e) {
  console.error(`\n❌ Error: ${e.message}`);
  console.error('\nTips:');
  console.error('  - Make sure you have internet access');
  console.error('  - Set GITHUB_TOKEN env var for higher API rate limits');
  process.exit(1);
}
