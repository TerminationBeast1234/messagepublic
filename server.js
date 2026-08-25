const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Store connected players
const players = new Map();
let playerIdCounter = 0;

// ============================================================
// WebSocket - Game clients connect here
// ============================================================

wss.on('connection', (ws) => {
    const playerId = ++playerIdCounter;
    players.set(playerId, { ws, connectedAt: new Date() });
    
    console.log(`🎮 Player ${playerId} connected (${players.size} total)`);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'system',
        message: 'Connected to messaging server'
    }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`📨 Player ${playerId}:`, message);
        } catch (e) {
            // Handle text messages
            console.log(`📨 Player ${playerId}:`, data.toString());
        }
    });

    ws.on('close', () => {
        players.delete(playerId);
        console.log(`❌ Player ${playerId} disconnected (${players.size} total)`);
    });
});

// ============================================================
// HTTP API - Discord bot sends messages here
// ============================================================

// ✅ FIXED: Send message to ALL players
app.post('/send', (req, res) => {
    const { message, sender } = req.body;
    
    console.log(`📤 Received: message="${message}", sender="${sender}"`);
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    const formattedMessage = sender ? `📢 ${sender}: ${message}` : `📢 ${message}`;
    console.log(`📤 Sending: "${formattedMessage}" to ${players.size} players`);
    
    // Send to all connected players
    let sentCount = 0;
    players.forEach((player) => {
        if (player.ws.readyState === 1) { // WebSocket.OPEN
            try {
                player.ws.send(JSON.stringify({
                    type: 'message',
                    message: formattedMessage,
                    sender: sender || 'Admin',
                    timestamp: new Date().toISOString()
                }));
                sentCount++;
            } catch (e) {
                console.log(`⚠️ Failed to send to player: ${e.message}`);
            }
        }
    });
    
    res.json({
        success: true,
        message: formattedMessage,
        players_reached: sentCount,
        total_players: players.size
    });
});

// ✅ FIXED: Clear messages
app.post('/clear', (req, res) => {
    console.log(`🧹 Clearing messages for ${players.size} players`);
    
    players.forEach((player) => {
        if (player.ws.readyState === 1) {
            try {
                player.ws.send(JSON.stringify({
                    type: 'clear',
                    message: ''
                }));
            } catch (e) {
                console.log(`⚠️ Failed to clear for player: ${e.message}`);
            }
        }
    });
    
    res.json({ success: true });
});

// ✅ FIXED: Get players
app.get('/players', (req, res) => {
    const playerList = [];
    players.forEach((player, id) => {
        playerList.push({ id: id });
    });
    res.json({ 
        total: players.size, 
        players: playerList 
    });
});

// ✅ FIXED: Status endpoint (MUST exist!)
app.get('/status', (req, res) => {
    res.json({ 
        status: 'online', 
        players: players.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ✅ FIXED: Root endpoint (for testing)
app.get('/', (req, res) => {
    res.json({
        name: 'VR Messaging Server',
        status: 'online',
        players: players.size,
        endpoints: {
            '/send': 'POST - Send message to all players',
            '/clear': 'POST - Clear messages',
            '/players': 'GET - Get connected players',
            '/status': 'GET - Server status'
        }
    });
});

// ✅ FIXED: Handle 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        path: req.url,
        method: req.method
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════');
    console.log('🚀 GLOBAL MESSAGING SERVER ONLINE');
    console.log('═══════════════════════════════════════════════');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`📊 Players: ${players.size}`);
    console.log('═══════════════════════════════════════════════');
});
