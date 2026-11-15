import { readFile, writeFile } from 'node:fs/promises';

const names = JSON.parse(await readFile(new URL('../catalog-repositories.json', import.meta.url), 'utf8'));
const token = process.env.GH_TOKEN;
if (!token) throw new Error('GH_TOKEN is required for catalog synchronization');
if (!Array.isArray(names) || names.length === 0 || names.length > 1000 || new Set(names.map((n) => n.toLowerCase())).size !== names.length)
  throw new Error('Invalid repository list');

async function api(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'QuickLauncher-catalog', 'X-GitHub-Api-Version': '2022-11-28' },
    redirect: 'error', signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}): ${path}`);
  return response.json();
}

const entries = [];
for (const name of names) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(name)) throw new Error('Invalid repository name');
  const prefix = `/repos/${name}`;
  const repo = await api(prefix);
  if (repo.private !== false || repo.full_name.toLowerCase() !== name.toLowerCase() || !Number.isSafeInteger(repo.id) || repo.id <= 0 || repo.html_url !== `https://github.com/${repo.full_name}`) throw new Error(`Invalid repository: ${name}`);
  const release = await api(`${prefix}/releases/latest`);
  const assets = release.assets.filter((asset) => asset.name.endsWith('.quicklauncher.json'));
  const asset = assets[0];
  if (assets.length !== 1 || !Number.isSafeInteger(release.id) || release.id <= 0 || !Number.isSafeInteger(asset.id) || asset.id <= 0 || !Number.isSafeInteger(asset.size) || asset.size < 0 || asset.size > 16000000 || !/^sha256:[a-f0-9]{64}$/i.test(asset.digest ?? '') || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(release.tag_name ?? '') || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.quicklauncher\.json$/.test(asset.name)) throw new Error(`Invalid release: ${name}`);
  const download = new URL(asset.browser_download_url);
  const expectedPath = `/${repo.full_name}/releases/download/${encodeURIComponent(release.tag_name)}/${encodeURIComponent(asset.name)}`;
  if (download.protocol !== 'https:' || download.hostname !== 'github.com' || download.port || download.username || download.password || download.search || download.hash || download.pathname.toLowerCase() !== expectedPath.toLowerCase()) throw new Error(`Invalid asset URL: ${name}`);
  let object = (await api(`${prefix}/git/ref/tags/${encodeURIComponent(release.tag_name)}`)).object;
  for (let i = 0; i < 8 && object.type === 'tag'; i++) {
    if (!/^[a-f0-9]{40}$/i.test(object.sha)) throw new Error(`Invalid tag: ${name}`);
    object = (await api(`${prefix}/git/tags/${object.sha}`)).object;
  }
  if (object.type !== 'commit' || !/^[a-f0-9]{40}$/i.test(object.sha)) throw new Error(`Invalid commit: ${name}`);
  entries.push({ repositoryID: repo.id, fullName: repo.full_name, description: repo.description ?? '', repositoryURL: repo.html_url,
    releaseID: release.id, assetID: asset.id, tag: release.tag_name, commit: object.sha.toLowerCase(), sha256: asset.digest.slice(7).toLowerCase(),
    assetSize: asset.size, assetURL: download.href });
}
await writeFile(new URL('../catalog.json', import.meta.url), JSON.stringify({version: 1, generatedAt: Math.floor(Date.now() / 1000), entries}, null, 2) + '\n');
console.log(`Updated catalog for ${entries.length} repositories`);
