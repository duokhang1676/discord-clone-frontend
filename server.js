const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

// Check if running on Render or production
const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true';

// Check if SSL certificates exist (only for local development)
const certPath = path.join(__dirname, 'cert', 'cert.pem');
const keyPath = path.join(__dirname, 'cert', 'key.pem');
const useHTTPS = !isProduction && !isRender && fs.existsSync(certPath) && fs.existsSync(keyPath);

let server;
if (useHTTPS) {
  const https = require('https');
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  server = https.createServer(options, app);
  console.log('🔒 HTTPS mode enabled (self-signed)');
} else {
  const http = require('http');
  server = http.createServer(app);
  if (isProduction || isRender) {
    console.log('🔒 Running behind reverse proxy (Render provides HTTPS)');
  } else {
    console.log('🔓 HTTP mode (SSL certificates not found)');
  }
}

const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  // Prevent premature disconnection
  pingTimeout: 60000,    // 60 seconds (default: 20s)
  pingInterval: 25000,   // 25 seconds (default: 25s)
  upgradeTimeout: 30000, // 30 seconds (default: 10s)
  // Allow longer time for connection to establish
  connectTimeout: 45000  // 45 seconds
});

// Debug middleware
io.use((socket, next) => {
  console.log('🔌 New connection attempt from:', socket.handshake.address);
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store connected users
const users = {};
let userCount = 0;

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id, 'from', socket.handshake.address);
  
  // Get username from handshake query
  const username = socket.handshake.query.username || `User ${userCount + 1}`;
  
  userCount++;
  users[socket.id] = {
    id: socket.id,
    name: username
  };

  // Send user info to the newly connected user
  console.log('📤 Sending user info to:', socket.id, 'Username:', username);
  socket.emit('user-info', users[socket.id]);
  
  // Notify all users about current user list
  console.log('📤 Broadcasting user list to all clients. Total users:', Object.keys(users).length);
  io.emit('user-list', Object.values(users));

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    console.log('Offer from', socket.id, 'to', data.to);
    socket.to(data.to).emit('offer', {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on('answer', (data) => {
    console.log('Answer from', socket.id, 'to', data.to);
    socket.to(data.to).emit('answer', {
      answer: data.answer,
      from: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.to).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });

  // Handle chat messages
  socket.on('chat-message', async (data) => {
    const messageType = data.type || 'text';
    const logMessage = messageType === 'image' ? '[Image]' : data.message;
    console.log('💬 Chat message from', data.username, ':', logMessage);
    
    // Broadcast to all users
    io.emit('chat-message', {
      user_id: socket.id,
      username: data.username,
      message: data.message,
      type: data.type || 'text',
      imageUrl: data.imageUrl || null,
      timestamp: data.timestamp
    });
    
    // Save to database via backend API
    try {
      const axios = require('axios');
      const BACKEND_URL = 'https://discord-clone-mp22.onrender.com';
      
      await axios.post(`${BACKEND_URL}/api/messages`, {
        user_id: socket.id,
        username: data.username,
        message: data.message,
        type: data.type || 'text',
        imageUrl: data.imageUrl || null,
        timestamp: data.timestamp
      }, {
        timeout: 5000 // 5 second timeout
      });
      
      console.log('✅ Message saved to database');
    } catch (error) {
      console.error('❌ Failed to save message:', error.message);
      // Don't fail the broadcast even if DB save fails
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete users[socket.id];
    io.emit('user-list', Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  if (isProduction || isRender) {
    console.log(`\n🚀 Server running in PRODUCTION mode`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`✅ HTTPS automatically provided by Render\n`);
  } else {
    const protocol = useHTTPS ? 'https' : 'http';
    console.log(`\n🚀 Server running on ${protocol}://localhost:${PORT}`);
    console.log(`\n📱 Access from other devices on your network:`);
    
    // Get local IP addresses
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    Object.keys(networkInterfaces).forEach((interfaceName) => {
      networkInterfaces[interfaceName].forEach((interface) => {
        if (interface.family === 'IPv4' && !interface.internal) {
          console.log(`   ${protocol}://${interface.address}:${PORT}`);
        }
      });
    });
    
    if (useHTTPS) {
      console.log(`\n⚠️  Accept the security warning in your browser (self-signed certificate)`);
      console.log(`   Click "Advanced" → "Proceed to [IP] (unsafe)"\n`);
    } else {
      console.log(`\n⚠️  To enable HTTPS (required for microphone access on network devices):`);
      console.log(`   Run: node generate-cert.js`);
      console.log(`   Then restart the server\n`);
    }
  }
});
