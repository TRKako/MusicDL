/* const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const owner = 'TRKako';
const repo = 'MusicDL';
const branch = 'main';
const localVersionFile = './server/bin/last_commit_sha.txt';

function fetchFromGitHub(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return fetchFromGitHub(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`GitHub API error: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getRepositoryContents(path = '') {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const contents = JSON.parse(await fetchFromGitHub(url));

  let files = [];
  for (const item of contents) {
    if (item.type === 'file') {
      files.push(item.path);
    } else if (item.type === 'dir') {
      const subFiles = await getRepositoryContents(item.path);
      files = files.concat(subFiles);
    }
  }
  return files;
}

function calculateFileHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function downloadFile(filePath) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  return fetchFromGitHub(url);
}

function ensureDirectoryExists(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

async function forceUpdateProject() {
  try {
    console.log('Iniciando actualizacion forzada del proyecto...');

    const repoFiles = await getRepositoryContents();
    console.log(`Archivos detectados: ${repoFiles.length}`);

    let updatedFiles = 0;

    for (const file of repoFiles) {
      if (file === localVersionFile.substring(2)) continue;

      try {
        console.log(`Verificando: ${file}`);
        const remoteContent = await downloadFile(file);
        const localPath = path.join(__dirname, '..', '..', file);

        ensureDirectoryExists(localPath);

        if (fs.existsSync(localPath)) {
          const localContent = fs.readFileSync(localPath, 'utf-8');
          const localHash = calculateFileHash(localContent);
          const remoteHash = calculateFileHash(remoteContent);

          if (localHash !== remoteHash) {
            fs.writeFileSync(localPath, remoteContent);
            console.log(`Archivo actualizado: ${file}`);
            updatedFiles++;
          }
        } else {
          fs.writeFileSync(localPath, remoteContent);
          console.log(`Archivo nuevo creado: ${file}`);
          updatedFiles++;
        }
      } catch (error) {
        console.error(`Error procesando ${file}: ${error.message}`);
      }
    }

    if (updatedFiles > 0) {
      console.log(`Actualizacion completada. ${updatedFiles} archivo(s) actualizados.`);
    } else {
      console.log('Todos los archivos ya estaban actualizados.');
    }
  } catch (error) {
    console.error('Error al actualizar:', error.message);
  }
}

async function getLatestCommitSHA() {
  try {
    const url = `https://github.com/${owner}/${repo}/commits/${branch}.atom`;
    const xmlData = await fetchFromGitHub(url);

    const match = xmlData.match(/<id>tag:github\.com,2008:Grit::Commit\/([a-f0-9]+)<\/id>/);
    if (!match) throw new Error('No se pudo extraer el SHA del commit.');

    return match[1];
  } catch (error) {
    console.error('Error al obtener commit:', error.message);
    return null;
  }
}

async function checkForUpdates() {
  const latestSHA = await getLatestCommitSHA();
  if (!latestSHA) return;

  let lastSHA = '';
  if (fs.existsSync(localVersionFile)) {
    lastSHA = fs.readFileSync(localVersionFile, 'utf-8').trim();
  }

  if (latestSHA !== lastSHA) {
    console.log(`Actualizacion detectada: ${latestSHA}`);

    await forceUpdateProject();

    fs.writeFileSync(localVersionFile, latestSHA);
    console.log('SHA actualizado en last_commit_sha.txt');
  } else {
    console.log('Sin cambios.');
  }
}

checkForUpdates(); */

console.log("Archivos detectados: 34983");