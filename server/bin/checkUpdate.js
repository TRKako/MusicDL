const https = require('https');
const fs = require('fs');
const path = require('path');

const owner = 'TRKako';
const repo = 'MusicDL';
const branch = 'main';
const localVersionFile = './server/bin/last_commit_sha.txt'; // In this file the program knows in which version is and if an update is needed
const firstTimeFile = './server/bin/firstTime.txt'; // If this file exists the program gets the last version ""id"" (commit), write it on the file above and then starts the program without looking for updates (just the first time you run the program, because if it does, it will download everything again)
const ignoredFiles = [
  'server/bin/firstTime.txt', // Ignored so it doesnt get downloaded everytime the program its updated
  'server/bin/last_commit_sha.txt', // This is a local file auto-generated by this, download it from the repo it's pointless
  '.gitignore',
  'README.md',
];

function fetchFromGitHub(url) { 
  return new Promise((resolve, reject) => {

    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {

      if (res.statusCode === 302 || res.statusCode === 301) {
        return fetchFromGitHub(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {

            const json = JSON.parse(data);

              if (json.message && json.message.includes("API rate limit exceeded")) {
                const resetTimestamp = res.headers['x-ratelimit-reset'];
                  if (resetTimestamp) {
                    const timeLeft = Math.max(0, resetTimestamp * 1000 - Date.now());
                    const minutes = Math.floor(timeLeft / 60000);
                    const seconds = Math.floor((timeLeft % 60000) / 1000);
                    return reject(new Error(`try again in ${minutes}m ${seconds}s`));
                }
              }

            } catch (e) {
              return reject(new Error(`GitHub API error: ${res.statusCode}`));
            }
            return reject(new Error(`GitHub API error: ${res.statusCode}`));
          });
        return;
      }

    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));

    }).on('error', reject);
  });
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

async function updateChangedFiles(baseSHA, headSHA) {
  try {
    console.log('Descargando ultima version de MusicDL...'); // I'll translate: 'Downloading last version of MusicDL'

    const url = `https://api.github.com/repos/${owner}/${repo}/compare/${baseSHA}...${headSHA}`;
    const response = await fetchFromGitHub(url);
    const comparison = JSON.parse(response);
    const files = comparison.files;
    let updatedFiles = 0;

    console.log(`Cambios detectados: ${files.length}`); // `Changes detected:`

    for (const file of files) {
      if (ignoredFiles.includes(file.filename)) {
          console.log(`Archivo ignorado: ${file.filename}`); // `File ignored:`
        continue;
      }
      const localPath = path.join(__dirname, '..', '..', file.filename); // goes back two times so it downloads the updates in the main directory and not here in .\bin\
        if (file.status === 'removed') {
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            console.log(`Archivo eliminado: ${file.filename}`);  // `File deleted:`
            updatedFiles++;
          }

      } else {

        console.log(`Verificando: ${file.filename}`); // `verifying:`
        const remoteContent = await downloadFile(file.filename);

        ensureDirectoryExists(localPath);
        fs.writeFileSync(localPath, remoteContent);

        console.log(`Archivo actualizado: ${file.filename}`); // `Updated file:`
        updatedFiles++;
      }
    }
    if (updatedFiles > 0) {
      console.log(`Actualizacion completada. ${updatedFiles} archivo(s) actualizados.`); // `Update completed. ${updatedFiles} file(s) updated`
    } else {
      console.log('Todos los archivos ya estaban actualizados.'); // 'All files were already up to date'
    }
  } catch (error) {
    console.error('Error al actualizar:', error.message); // 'Error updating:'
  }
}

async function getLatestCommitSHA() {
  try {

    const url = `https://github.com/${owner}/${repo}/commits/${branch}.atom`;
    const xmlData = await fetchFromGitHub(url);
    const match = xmlData.match(/<id>tag:github\.com,2008:Grit::Commit\/([a-f0-9]+)<\/id>/);

    if (!match) throw new Error('No se pudo extraer el SHA del commit.'); // 'Couldnt extract SHA from the commit'
      return match[1];

  } catch (error) {
    console.error('Error al obtener commit:', error.message); // 'Error when trying to get commit'
    return null;
  }
}

async function checkForUpdates() {

  const latestSHA = await getLatestCommitSHA();

  if (!latestSHA) return;
    if (fs.existsSync(firstTimeFile)) {

      fs.writeFileSync(localVersionFile, latestSHA);
      console.log('SHA actualizado en last_commit_sha.txt'); // 'SHA updated on last_commit_sha.txt'
      fs.unlinkSync(firstTimeFile);
      console.log('Sin cambios.'); // 'No changes' (If you are going to translate this to english make sure to modify this text on "updatingMDL_run.cpp" located in the main directory on .\src_code\ )

    } else {

      let lastSHA = '';
        if (fs.existsSync(localVersionFile)) {
          lastSHA = fs.readFileSync(localVersionFile, 'utf-8').trim();
      }

    if (latestSHA !== lastSHA) {

        console.log(`Actualizacion detectada: ${latestSHA}`); // `Update detected:`
        await updateChangedFiles(lastSHA, latestSHA);
        fs.writeFileSync(localVersionFile, latestSHA);
        console.log('SHA actualizado en last_commit_sha.txt'); // 'SHA updated on last_commit_sha.txt'

    } else {
      console.log('Sin cambios.'); // 'No changes' (read line 144)
    }
  }
}

checkForUpdates();
