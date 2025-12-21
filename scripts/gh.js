import 'dotenv/config';
import { graphql as graphqlBase } from '@octokit/graphql';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Missing GITHUB_TOKEN in environment (.env).');
  process.exit(1);
}

const graphql = graphqlBase.defaults({
  headers: { authorization: `token ${token}` },
});

/*
  ! WHITELISTED REPO PARSING
*/
function parseWhitelistRepos(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [owner, name] = s.split('/');
      return { owner, name, nameWithOwner: `${owner}/${name}` };
    })
    .filter((x) => x.owner && x.name);
}

async function fetchRepoMetaAndLanguages(owner, name) {
  const query = /* GraphQL */ `
    query RepoMetaAndLanguages($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        nameWithOwner
        isFork
        isArchived
        isDisabled
        isEmpty
        viewerPermission
        languages(first: 100, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name } }
        }
      }
    }
  `;

  const data = await graphql(query, { owner, name });
  const repo = data.repository;

  if (!repo) return null;

  const edges = repo.languages?.edges ?? [];
  const langs = {};
  for (const e of edges) {
    const lang = e.node?.name;
    const size = e.size ?? 0;
    if (!lang || size <= 0) continue;
    langs[lang] = (langs[lang] ?? 0) + size;
  }

  return { repo, langs };
}
/*
  ! END OF WHITELIST REPO SECTION
*/

/** Simple concurrency limiter */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;

  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function fetchOwnedRepos() {
  const repos = [];
  let after = null;

  const query = /* GraphQL */ `
    query OwnedRepos($after: String) {
      viewer {
        login
        repositories(
          first: 100
          after: $after
          ownerAffiliations: OWNER
          isFork: false
          orderBy: { field: NAME, direction: ASC }
        ) {
          pageInfo { hasNextPage endCursor }
          nodes {
            name
            nameWithOwner
            isArchived
            isDisabled
            isEmpty
            visibility
            url
          }
        }
      }
    }
  `;

  while (true) {
    const data = await graphql(query, { after });
    const nodes = data.viewer.repositories.nodes ?? [];
    repos.push(...nodes);

    const { hasNextPage, endCursor } = data.viewer.repositories.pageInfo;
    if (!hasNextPage) break;
    after = endCursor;
  }

  return repos;
}

async function fetchRepoLanguages(nameWithOwner) {
  const [owner, name] = nameWithOwner.split('/');
  if (!owner || !name) return {};

  const query = /* GraphQL */ `
    query RepoLanguages($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        languages(first: 100, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node { name }
          }
        }
      }
    }
  `;

  const data = await graphql(query, { owner, name });
  const edges = data.repository?.languages?.edges ?? [];

  const langs = {};
  for (const e of edges) {
    const lang = e.node?.name;
    const size = e.size ?? 0;
    if (!lang || size <= 0) continue;
    langs[lang] = (langs[lang] ?? 0) + size;
  }
  return langs;
}

async function main() {
  const repos = await fetchOwnedRepos();

  // Optional: skip empty/disabled/archived if you want; currently we keep them (languages will just be empty).
  const activeRepos = repos.filter((r) => !r.isDisabled);

  console.log(`Found ${repos.length} owned non-fork repos (${activeRepos.length} not disabled).`);

  const perRepo = {};
  const totalsByLang = {};

  // Tune concurrency if you have tons of repos; 6–12 is usually friendly.
  const concurrency = 8;

  // Whitelisted non-owned repos but still near 100% contribution value
  const whitelist = parseWhitelistRepos(process.env.EXTRA_WHITELISTED_REPOS);
  const ownedSet = new Set(activeRepos.map((r) => r.nameWithOwner));
  const extraRepos = whitelist.filter((r) => !ownedSet.has(r.nameWithOwner));

  console.log(`Whitelist repos requested: ${whitelist.length}, extra (not owned): ${extraRepos.length}`);

  await mapLimit(extraRepos, concurrency, async ({ owner, name, nameWithOwner }) => {
    const result = await fetchRepoMetaAndLanguages(owner, name);
    if (!result) {
      console.warn(`- Skipped ${nameWithOwner}: not found or no access`);
      return;
    }

    const { repo, langs } = result;

    // Enforce "ignore forks" globally (matches your owned query’s behavior)
    if (repo.isFork) {
      console.warn(`- Skipped ${repo.nameWithOwner}: is a fork`);
      return;
    }
    if (repo.isDisabled) {
      console.warn(`- Skipped ${repo.nameWithOwner}: disabled`);
      return;
    }

    // Record in perRepo and aggregate totals
    perRepo[repo.nameWithOwner.toLowerCase()] = langs;

    for (const [lang, bytes] of Object.entries(langs)) {
      totalsByLang[lang.toLowerCase()] = (totalsByLang[lang.toLowerCase()] ?? 0) + bytes;
    }
  });

  await mapLimit(activeRepos, concurrency, async (repo) => {
    const langs = await fetchRepoLanguages(repo.nameWithOwner);
    perRepo[repo.nameWithOwner.toLowerCase()] = langs;

    for (const [lang, bytes] of Object.entries(langs)) {
      totalsByLang[lang.toLowerCase()] = (totalsByLang[lang.toLowerCase()] ?? 0) + bytes;
    }
  });

  
  // Print summary sorted by bytes desc
  const sorted = Object.entries(totalsByLang).sort((a, b) => b[1] - a[1]);
  console.log(extraRepos)
  console.log(perRepo)

  // Write data to JSON file
  const outputData = {
    // summary: {
    //   totalRepos: repos.length,
    //   activeRepos: activeRepos.length,
    // },
    languageTotals: sorted.map(([lang, bytes]) => ({
      language: lang,
      bytes,
    })),
    perRepo: [...activeRepos, ...extraRepos].map(repo => {
      const langs = perRepo[repo.nameWithOwner] ?? {};
      const entries = Object.entries(langs).sort((a, b) => b[1] - a[1]);
      const sum = Object.values(langs).reduce((a, b) => a + b, 0);
      
      return {
        nameWithOwner: repo.nameWithOwner,
        url: repo.url,
        totalBytes: sum,
        languages: entries.map(([lang, bytes]) => ({
          language: lang,
          bytes,
        }))
      };
    })
  };

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.join(__dirname, '..', 'data', 'data.json');
  await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log('Data written to data.json');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

/*

console.log('\n=== Language totals (Linguist bytes) ===');
  const langColWidth = Math.max(8, ...sorted.map(([l]) => l.length));
  const bytesColWidth = Math.max(10, ...sorted.map(([, b]) => formatBytes(b).length));

  console.log(`${padRight('Language', langColWidth)}  ${padLeft('Size', bytesColWidth)}  Percent`);
  console.log(`${'-'.repeat(langColWidth)}  ${'-'.repeat(bytesColWidth)}  -------`);

  for (const [lang, bytes] of sorted) {
    const pct = totalBytes > 0 ? (bytes / totalBytes) * 100 : 0;
    console.log(
      `${padRight(lang, langColWidth)}  ${padLeft(formatBytes(bytes), bytesColWidth)}  ${pct.toFixed(2)}%`
    );
  }

  console.log(`\nTotal across all repos: ${formatBytes(totalBytes)}`);

  // Optional: print per-repo top languages
  console.log('\n=== Per-repo top languages (top 5) ===');
  for (const repo of activeRepos) {
    const langs = perRepo[repo.nameWithOwner] ?? {};
    const entries = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sum = Object.values(langs).reduce((a, b) => a + b, 0);

    const summary = entries.length
      ? entries.map(([l, b]) => `${l} ${formatBytes(b)}`).join(', ')
      : '(no languages / empty)';

    console.log(`- ${repo.nameWithOwner} — ${formatBytes(sum)} — ${summary}`);
  }

*/
