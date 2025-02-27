const { exec, spawn } = require('child_process');
const express = require('./server/node_modules/express');
const multer = require('./server/node_modules/multer');
const ytMusicAPI = require('./server/node_modules/youtube-music-apis');
const http = require('http');
const path = require("path");
const fs = require("fs");
const os = require('os')
const app = express();

const PORT = 80;
const HOST = '0.0.0.0';

const upload = multer({
    dest: './public/assets/uploads/',
    fileFilter: (req, file, cb) => {

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de archivo no soportado'));
      }
    },
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const BG_IMAGE_PATH = path.join(__dirname, './public/assets/uploads', 'background.jpg');
  
  app.post('/upload', upload.single('bgImage'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No se envió ningún archivo.');
    }
  
    if (fs.existsSync(BG_IMAGE_PATH)) {
      fs.unlinkSync(BG_IMAGE_PATH);
    }
  
    fs.renameSync(req.file.path, BG_IMAGE_PATH);
  
    res.status(200).send({ message: 'Imagen subida con éxito', imageUrl: `./public/assets/uploads/background.jpg` });
  });

  app.use((err, req, res, next) => {
    if (err.message === 'Tipo de archivo no soportado') {
      return res.status(400).send('Tipo de archivo no soportado.');
    }
  
    next(err);
  });

  app.use('/uploads', express.static(path.join(__dirname, './public/assets/uploads')));

  
  app.delete('/BGDEL', (req, res) => {
    const BG_IMAGE_PATH = path.join(__dirname, './public/assets/uploads', 'background.jpg');
  
    if (fs.existsSync(BG_IMAGE_PATH)) {
      fs.unlinkSync(BG_IMAGE_PATH);
    } else {
     res.status(404).send({ message: 'No hay fondo que restaurar.' });
    }
  });

  app.get('/check-internet', async (req, res) => {
    try {
        const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
            method: 'GET',
            cache: 'no-store',
        });

        if (response.ok) {
            res.json({ online: true });
        } else {
            res.json({ online: false });
        }
    } catch (error) {
        res.json({ online: false });
    }
});

let globalProgress = 0; 

app.post('/songDL', async (req, res) => {
  if (!req.body || !req.body.link) {
      return res.status(400).send('No se recibió ningún enlace.');
  }

  globalProgress = 0;
  fs.writeFileSync('server\\bin\\progress.json', JSON.stringify({ progress: 0 }));

  const songLink = req.body.link;
  
  const downloadDir = path.join(os.homedir(), '\\Desktop\\MusicDL');
  const outputTemplate = path.join(downloadDir, '%(title)s.%(ext)s');

  const args = [
      '-o', outputTemplate, 'PROGRESS: %(percent)d',
      songLink
  ];
  
  // const process = spawn('server/bin/yt-dlp', args);
  const process = spawn(path.join(__dirname, 'server/bin/yt-dlp.exe'), args);

  
  process.stdout.on('data', (data) => {
    const output = data.toString();
    const lines = output.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      
      if (line.startsWith('progress:')) {
        const match = line.match(/progress:(\d+\.?\d*)%/);
        if (match) {
          const raw = parseFloat(match[1]);
          
          globalProgress = raw >= 100 ? 75 : Math.floor(raw);
          fs.writeFileSync('server\\bin\\progress.json', JSON.stringify({ progress: globalProgress }));
        }
      }
      else if (line.includes('Deleting original file')) {
        globalProgress = 100;
        fs.writeFileSync('server\\bin\\progress.json', JSON.stringify({ progress: globalProgress }));
      }
    });
  });

  process.on('close', (code) => {    
    
    if (globalProgress < 100) {
      globalProgress = 100;
      fs.writeFileSync('server\\bin\\progress.json', JSON.stringify({ progress: globalProgress }));
    }

    setTimeout(() => {
      globalProgress = 0;
      fs.writeFileSync('server\\bin\\progress.json', JSON.stringify({ progress: 0 }));
    }, 5000);
  });
  
  res.json({ success: true });
});

app.get('/progress', (req, res) => {
  try {
    const data = fs.readFileSync('server\\bin\\progress.json', 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.json({ progress: 0 });
  }
});


app.post('/openFolder', async (req, res) => {
  if (!req.body) {
    return res.status(400).send('Error: Body vacío');
  }

  const downloadDir = path.join(os.homedir(), 'Desktop', 'MusicDL');
  const nfDir = path.join(os.homedir(), 'Desktop');

  try {
    
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    exec(`start "" explorer "${downloadDir}"`, (error) => {
      if (error) {
        console.error('Error al abrir la carpeta:', error);
        return res.status(500).send('Error al abrir la carpeta');
      }
/*       res.send('¡Carpeta lista y abierta en el espacio-tiempo!'); */
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).send(err.message);
  }
});



app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './public/','musicDL.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, './public/','musicDL.html'));
});

app.use('/assets', express.static(path.join(__dirname, './public/assets')));

app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, './public/pages', 'searchResults.html'));
});

app.get('/help', (req, res) => {
  res.sendFile(path.join(__dirname, './public/pages', 'help.html'));
});

app.get('/search/rawDataResults', async (req, res) => {
  const query = req.query.query;

  if (!query) {
      return res.status(400).json({ error: 'Por favor, proporciona un término de búsqueda.' });
  }

  try {

    const musicRes = await ytMusicAPI.searchForMusic(query);

    res.json(musicRes);

  } catch (error) {
      console.error('Error en la búsqueda:', error);
      res.status(500).json({ error: 'Hubo un error al procesar tu solicitud.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  server.close(() => {
      process.exit(0);
  });
});