const fs = require('fs');
const path = require('path');
const https = require('https');

const INSTALL_ROOT = path.join(process.env.APPDATA, 'Adobe', 'CEP', 'extensions');
const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'Oxy720';
const REPO_NAME = 'plugins';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'User-Agent': 'DHD-PluginManager' }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'User-Agent': 'DHD-PluginManager' }
    };
    https.get(url, options, (res) => {
      // handle redirects
      if (res.statusCode === 302 || res.statusCode === 301) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchContents(repoPath) {
  const url = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${repoPath}`;
  return await httpsGet(url);
}

async function installPlugin(plugin, onProgress) {
  const destRoot = path.join(INSTALL_ROOT, plugin.id);
  const contents = await fetchContents(plugin.repoPath);
  await processContents(contents, destRoot, onProgress);
}

async function processContents(contents, destRoot, onProgress) {
  for (const item of contents) {
    const destPath = path.join(destRoot, item.name);
    if (item.type === 'file') {
      if (onProgress) onProgress(`writing ${item.name}`);
      await downloadFile(item.download_url, destPath);
    } else if (item.type === 'dir') {
      const subContents = await fetchContents(item.path);
      await processContents(subContents, path.join(destRoot, item.name), onProgress);
    }
  }
}

function uninstallPlugin(pluginId) {
  const destRoot = path.join(INSTALL_ROOT, pluginId);
  if (fs.existsSync(destRoot)) {
    fs.rmSync(destRoot, { recursive: true, force: true });
    return true;
  }
  return false;
}

function isInstalled(pluginId) {
  return fs.existsSync(path.join(INSTALL_ROOT, pluginId));
}

function getInstalledVersion(pluginId) {
  const manifestPath = path.join(INSTALL_ROOT, pluginId, 'CSXS', 'manifest.xml');
  if (!fs.existsSync(manifestPath)) return null;
  const content = fs.readFileSync(manifestPath, 'utf8');
  const match = content.match(/ExtensionBundleVersion="([^"]+)"/);
  return match ? match[1] : null;
}

module.exports = { installPlugin, uninstallPlugin, isInstalled, getInstalledVersion };
