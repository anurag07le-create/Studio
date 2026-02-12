const express = require('express');
console.log("Starting app.js...");
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const cors = require('cors');

// Run database migrations on startup
const { runMigrations } = require('./db/migrations');
runMigrations();

// Route outbound HTTP(S) through a proxy if the environment provides one.
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy ||
  process.env.HTTP_PROXY || process.env.http_proxy ||
  process.env.ALL_PROXY || process.env.all_proxy;
if (proxyUrl) {
  const { ProxyAgent, setGlobalDispatcher } = require('undici');
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  console.log('Using proxy for outbound HTTP(S) requests.');
}

const storyboardRoutes = require('./routes/storyboardRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const videoLogRoutes = require('./routes/videoLogRoutes');
const storyboardLogRoutes = require('./routes/storyboardLogRoutes');
const v2Routes = require('./routes/v2');

const app = express();
const port = process.env.PORT || 3005;

app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '20mb' })); // For parsing application/json (allow bigger payload for base64 images)
app.use('/videos', express.static(path.join(__dirname, '../data/videos')));
app.use('/exports', express.static(path.join(__dirname, '../data/exports')));
app.use('/character-uploads', express.static(path.join(__dirname, '../data/character-uploads')));
app.use('/temp_images', express.static(path.join(__dirname, '../data/temp_images')));

// V1 API routes (backward compatible)
app.use('/api/storyboard', storyboardRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/video-logs', videoLogRoutes);
app.use('/api/storyboard-logs', storyboardLogRoutes);

// V2 API routes
app.use('/api/v2', v2Routes);

app.get('/', (req, res) => {
  res.json({
    name: 'Pucho StoryGen Backend',
    v1: '/api/',
    v2: '/api/v2/',
    status: 'running',
  });
});

// Phase 3: HTTP server + Socket.IO
const http = require('http');
const { initSocket } = require('./services/socketService');
const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
  console.log(`Pucho StoryGen Backend listening at http://localhost:${port}`);
  console.log(`Socket.IO enabled for real-time events`);
});
