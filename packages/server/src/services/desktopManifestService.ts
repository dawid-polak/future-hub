import https from 'https';

interface GhAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GhRelease {
  tag_name: string;
  published_at: string;
  assets: GhAsset[];
  prerelease: boolean;
  draft: boolean;
}

export interface DesktopManifest {
  version: string;
  releasedAt: string | null;
  available: boolean;
  urls: {
    mac: string | null;
    win: string | null;
    linuxAppImage: string | null;
    linuxDeb: string | null;
  };
  sizes: {
    mac: number | null;
    win: number | null;
    linuxAppImage: number | null;
    linuxDeb: number | null;
  };
  releaseUrl: string;
}

const GH_OWNER = 'dawid-polak';
const GH_REPO = 'future-hub';
const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { manifest: DesktopManifest; expiresAt: number } | null = null;

function fetchLatestRelease(): Promise<GhRelease | null> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: `/repos/${GH_OWNER}/${GH_REPO}/releases`,
        headers: {
          'User-Agent': 'future-hub-desktop',
          Accept: 'application/vnd.github+json',
        },
        timeout: 8000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const releases: GhRelease[] = JSON.parse(body);
            if (!Array.isArray(releases)) {
              resolve(null);
              return;
            }
            const latest = releases.find(
              (r) => !r.draft && !r.prerelease && r.tag_name.startsWith('desktop-v')
            );
            resolve(latest || null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

function pickAsset(assets: GhAsset[], suffix: string): GhAsset | null {
  return assets.find((a) => a.name.toLowerCase().endsWith(suffix.toLowerCase())) || null;
}

export async function getDesktopManifest(): Promise<DesktopManifest> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.manifest;
  }

  const release = await fetchLatestRelease();
  let manifest: DesktopManifest;

  if (release) {
    const dmg = pickAsset(release.assets, '.dmg');
    const exe = pickAsset(release.assets, '.exe');
    const appImage = pickAsset(release.assets, '.AppImage');
    const deb = pickAsset(release.assets, '.deb');

    manifest = {
      version: release.tag_name.replace(/^desktop-v/, ''),
      releasedAt: release.published_at,
      available: true,
      urls: {
        mac: dmg?.browser_download_url || null,
        win: exe?.browser_download_url || null,
        linuxAppImage: appImage?.browser_download_url || null,
        linuxDeb: deb?.browser_download_url || null,
      },
      sizes: {
        mac: dmg?.size || null,
        win: exe?.size || null,
        linuxAppImage: appImage?.size || null,
        linuxDeb: deb?.size || null,
      },
      releaseUrl: `https://github.com/${GH_OWNER}/${GH_REPO}/releases/tag/${release.tag_name}`,
    };
  } else {
    manifest = {
      version: '0.0.0',
      releasedAt: null,
      available: false,
      urls: { mac: null, win: null, linuxAppImage: null, linuxDeb: null },
      sizes: { mac: null, win: null, linuxAppImage: null, linuxDeb: null },
      releaseUrl: `https://github.com/${GH_OWNER}/${GH_REPO}/releases`,
    };
  }

  cache = { manifest, expiresAt: Date.now() + CACHE_TTL_MS };
  return manifest;
}
