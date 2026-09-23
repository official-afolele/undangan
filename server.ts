import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Directories setup
  const DATA_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const CONFIG_FILE = path.join(DATA_DIR, 'weddingConfig.json');
  const GUESTS_FILE = path.join(DATA_DIR, 'weddingGuests.json');
  const WISHES_FILE = path.join(DATA_DIR, 'weddingWishes.json');

  // Serve uploads and public assets statically
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // ================= API ROUTES FIRST =================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // GET /api/config
  app.get('/api/config', (req, res) => {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return res.json(JSON.parse(raw));
      }
    } catch (err) {
      console.error('Error reading config file:', err);
    }
    return res.status(404).json({ error: 'Config not found' });
  });

  // POST /api/config
  app.post('/api/config', (req, res) => {
    try {
      const newConfig = req.body;
      if (!newConfig || typeof newConfig !== 'object') {
        return res.status(400).json({ error: 'Invalid config format' });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf-8');
      return res.json({ success: true, config: newConfig });
    } catch (err) {
      console.error('Error saving config file:', err);
      return res.status(500).json({ error: 'Failed to save config' });
    }
  });

  // GET /api/guests
  app.get('/api/guests', (req, res) => {
    try {
      if (fs.existsSync(GUESTS_FILE)) {
        const raw = fs.readFileSync(GUESTS_FILE, 'utf-8');
        return res.json(JSON.parse(raw));
      }
    } catch (err) {
      console.error('Error reading guests file:', err);
    }
    return res.status(404).json({ error: 'Guests not found' });
  });

  // POST /api/guests
  app.post('/api/guests', (req, res) => {
    try {
      const guests = req.body;
      if (!Array.isArray(guests)) {
        return res.status(400).json({ error: 'Guests must be an array' });
      }
      fs.writeFileSync(GUESTS_FILE, JSON.stringify(guests, null, 2), 'utf-8');
      return res.json({ success: true, guests });
    } catch (err) {
      console.error('Error saving guests file:', err);
      return res.status(500).json({ error: 'Failed to save guests' });
    }
  });

  // GET /api/wishes
  app.get('/api/wishes', (req, res) => {
    try {
      if (fs.existsSync(WISHES_FILE)) {
        const raw = fs.readFileSync(WISHES_FILE, 'utf-8');
        return res.json(JSON.parse(raw));
      }
      return res.json([]);
    } catch (err) {
      console.error('Error reading wishes file:', err);
      return res.json([]);
    }
  });

  // POST /api/wishes
  app.post('/api/wishes', (req, res) => {
    try {
      const newWish = req.body;
      if (!newWish || !newWish.name || typeof newWish.name !== 'string') {
        return res.status(400).json({ error: 'Nama tidak boleh kosong' });
      }

      const wishItem = {
        id: newWish.id || ('wish-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
        name: String(newWish.name).trim(),
        message: String(newWish.message || '').trim(),
        attendance: ['hadir', 'ragu', 'tidak'].includes(newWish.attendance) ? newWish.attendance : 'hadir',
        timestamp: newWish.timestamp || 'Baru saja'
      };

      let currentWishes: any[] = [];
      if (fs.existsSync(WISHES_FILE)) {
        try {
          currentWishes = JSON.parse(fs.readFileSync(WISHES_FILE, 'utf-8'));
          if (!Array.isArray(currentWishes)) {
            currentWishes = [];
          }
        } catch {
          currentWishes = [];
        }
      }

      // Prepend the new wish, deduplicate by id
      const updated = [wishItem, ...currentWishes.filter((w: any) => w.id !== wishItem.id)];
      fs.writeFileSync(WISHES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      return res.json({ success: true, wishes: updated, added: wishItem });
    } catch (err) {
      console.error('Error saving wish:', err);
      return res.status(500).json({ error: 'Gagal menyimpan ucapan' });
    }
  });

  // DELETE /api/wishes/:id
  app.delete('/api/wishes/:id', (req, res) => {
    try {
      const { id } = req.params;
      let currentWishes: any[] = [];
      if (fs.existsSync(WISHES_FILE)) {
        try {
          currentWishes = JSON.parse(fs.readFileSync(WISHES_FILE, 'utf-8'));
          if (!Array.isArray(currentWishes)) {
            currentWishes = [];
          }
        } catch {
          currentWishes = [];
        }
      }
      const updated = currentWishes.filter((w: any) => String(w.id) !== String(id));
      fs.writeFileSync(WISHES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      return res.json({ success: true, wishes: updated });
    } catch (err) {
      console.error('Error deleting wish:', err);
      return res.status(500).json({ error: 'Gagal menghapus ucapan' });
    }
  });

  // Multer setup for direct multipart file uploads (works reliably on mobile & large photos)
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const cleanExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
      const fileName = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${cleanExt}`;
      cb(null, fileName);
    }
  });
  const upload = multer({
    storage,
    limits: { fileSize: 30 * 1024 * 1024 } // 30MB
  });

  // Helper to sync uploaded file to dist/uploads if running in production
  const syncToDist = (fileName: string, buffer?: Buffer) => {
    try {
      const distUploads = path.join(process.cwd(), 'dist', 'uploads');
      if (fs.existsSync(distUploads)) {
        const dest = path.join(distUploads, fileName);
        if (buffer) {
          fs.writeFileSync(dest, buffer);
        } else {
          fs.copyFileSync(path.join(UPLOADS_DIR, fileName), dest);
        }
      }
    } catch (e) {
      // ignore sync error
    }
  };

  // POST /api/upload-file (Multipart form upload from phone / desktop)
  app.post('/api/upload-file', upload.single('photo'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'File tidak ditemukan' });
      }
      const fileName = req.file.filename;
      syncToDist(fileName);
      return res.json({ success: true, url: `/uploads/${fileName}` });
    } catch (err: any) {
      console.error('Error handling upload-file:', err);
      return res.status(500).json({ error: err?.message || 'Gagal mengunggah file' });
    }
  });

  // POST /api/upload (Base64 dataUrl upload)
  app.post('/api/upload', (req, res) => {
    try {
      const { dataUrl } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return res.status(400).json({ error: 'Invalid image data' });
      }
      const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Malformed base64 data' });
      }
      const mime = matches[1].toLowerCase();
      let ext = 'jpg';
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';

      const fileName = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const destPath = path.join(UPLOADS_DIR, fileName);
      const buffer = Buffer.from(matches[2], 'base64');
      fs.writeFileSync(destPath, buffer);
      syncToDist(fileName, buffer);

      return res.json({ success: true, url: `/uploads/${fileName}` });
    } catch (err) {
      console.error('Error uploading file:', err);
      return res.status(500).json({ error: 'Upload failed' });
    }
  });

  // POST /api/upload-url (Download external image / Google Drive to local /uploads/ so it never breaks)
  app.post('/api/upload-url', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL foto diperlukan' });
      }

      let fetchUrl = url.trim();
      // Google Drive resolver to direct download CDN
      const isGoogleDrive =
        fetchUrl.includes('drive.google.com') ||
        fetchUrl.includes('drive.usercontent.google.com') ||
        fetchUrl.includes('docs.google.com');

      if (isGoogleDrive) {
        const fileDMatch = fetchUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const dMatch = fetchUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        const idMatch = fetchUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const fileId = (fileDMatch && fileDMatch[1]) || (dMatch && dMatch[1]) || (idMatch && idMatch[1]);
        if (fileId) {
          fetchUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
        }
      }

      const fetchRes = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });

      if (!fetchRes.ok) {
        return res.status(400).json({ 
          error: `Gagal mengambil gambar dari tautan (${fetchRes.status}). Jika menggunakan Google Drive, pastikan izin telah disetel ke "Siapa saja yang memiliki link".` 
        });
      }

      const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
      let ext = 'jpg';
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';
      else if (contentType.includes('gif')) ext = 'gif';

      const fileName = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const destPath = path.join(UPLOADS_DIR, fileName);
      const arrayBuf = await fetchRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      fs.writeFileSync(destPath, buffer);
      syncToDist(fileName, buffer);

      return res.json({ success: true, url: `/uploads/${fileName}` });
    } catch (err: any) {
      console.error('Error fetching image from url:', err);
      return res.status(500).json({ error: err?.message || 'Gagal memproses tautan foto' });
    }
  });

  // GET /api/og-image
  // Serves the couple photo specifically formatted for WhatsApp and social media link previews
  app.get('/api/og-image', (req, res) => {
    try {
      let couplePhoto = '';
      if (fs.existsSync(CONFIG_FILE)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
          if (cfg.couplePhoto) {
            couplePhoto = cfg.couplePhoto;
          }
        } catch {}
      }

      if (couplePhoto) {
        if (couplePhoto.startsWith('/uploads/')) {
          const localPath = path.join(process.cwd(), 'public', couplePhoto);
          if (fs.existsSync(localPath)) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return fs.createReadStream(localPath).pipe(res);
          }
        } else if (couplePhoto.startsWith('http://') || couplePhoto.startsWith('https://')) {
          return res.redirect(couplePhoto);
        }
      }

      const defaultCouplePhoto = path.join(process.cwd(), 'public', 'couple-photo.jpg');
      if (fs.existsSync(defaultCouplePhoto)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return fs.createReadStream(defaultCouplePhoto).pipe(res);
      }

      return res.status(404).send('Image not found');
    } catch (err) {
      console.error('Error serving og-image:', err);
      return res.status(500).send('Error');
    }
  });

  // Helper to extract absolute public base URL (handling proxies/Cloud Run)
  function getBaseUrl(req: express.Request): string {
    const forwardedProto = req.get('x-forwarded-proto');
    const proto = (forwardedProto || req.protocol || 'https').split(',')[0].trim();
    const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
    return `${proto}://${host}`;
  }

  // Helper to inject dynamic Open Graph tags into index.html
  const handleHtmlWithOpenGraph = async (
    req: express.Request,
    res: express.Response,
    viteInstance?: any
  ) => {
    try {
      const baseUrl = getBaseUrl(req);
      const guestName = typeof req.query.to === 'string' ? req.query.to.trim() : '';

      let groomName = 'Jaka';
      let brideName = 'Dian';
      if (fs.existsSync(CONFIG_FILE)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
          if (cfg.groom?.name) groomName = cfg.groom.name;
          if (cfg.bride?.name) brideName = cfg.bride.name;
        } catch {}
      }

      const ogTitle = `${groomName} & ${brideName}`;
      const ogDesc = guestName
        ? `Kepada Yth. Bapak/Ibu/Saudara/i ${guestName}. Tanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk menghadiri acara pernikahan kami.`
        : `Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami.`;
      const ogImageUrl = `${baseUrl}/api/og-image`;
      const ogPageUrl = `${baseUrl}${req.originalUrl}`;

      let html = '';
      if (viteInstance) {
        const indexPath = path.join(process.cwd(), 'index.html');
        html = fs.readFileSync(indexPath, 'utf-8');
        html = await viteInstance.transformIndexHtml(req.originalUrl, html);
      } else {
        const distIndexPath = path.join(process.cwd(), 'dist', 'index.html');
        html = fs.readFileSync(distIndexPath, 'utf-8');
      }

      // Replace or enrich Open Graph and Twitter tags with dynamic couple data
      html = html
        .replace(/<title>.*?<\/title>/i, `<title>${ogTitle} - Undangan Pernikahan</title>`)
        .replace(/<meta property="og:title" content="[^"]*"/i, `<meta property="og:title" content="${ogTitle}"`)
        .replace(/<meta property="og:description" content="[^"]*"/i, `<meta property="og:description" content="${ogDesc}"`)
        .replace(/<meta property="og:image" content="[^"]*"/i, `<meta property="og:image" content="${ogImageUrl}"`)
        .replace(/<meta property="og:image:secure_url" content="[^"]*"/i, `<meta property="og:image:secure_url" content="${ogImageUrl}"`)
        .replace(/<meta name="twitter:title" content="[^"]*"/i, `<meta name="twitter:title" content="${ogTitle}"`)
        .replace(/<meta name="twitter:description" content="[^"]*"/i, `<meta name="twitter:description" content="${ogDesc}"`)
        .replace(/<meta name="twitter:image" content="[^"]*"/i, `<meta name="twitter:image" content="${ogImageUrl}"`);

      // Ensure og:url is present
      if (!html.includes('property="og:url"')) {
        html = html.replace('</head>', `  <meta property="og:url" content="${ogPageUrl}" />\n  </head>`);
      }

      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    } catch (err) {
      console.error('Error rendering HTML with Open Graph:', err);
      if (viteInstance) {
        res.sendFile(path.join(process.cwd(), 'index.html'));
      } else {
        res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
      }
    }
  };

  // ================= VITE MIDDLEWARE / STATIC SERVING =================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // Intercept main entry routes for WhatsApp scrapers and web browsers
    app.get(['/', '/index.html'], (req, res) => {
      handleHtmlWithOpenGraph(req, res, vite);
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      handleHtmlWithOpenGraph(req, res);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
