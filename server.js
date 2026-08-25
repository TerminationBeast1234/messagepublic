const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const players = new Map();
let playerIdCounter = 0;

// WebSocket connections
wss.on('connection', (ws) => {
    const playerId = ++playerIdCounter;
    players.set(playerId, { ws, connectedAt: new Date() });
    console.log(`🎮 Player ${playerId} connected (${players.size} total)`);
    
    ws.send(JSON.stringify({
        type: 'system',
        message: 'Connected to messaging server'
    }));

    ws.on('close', () => {
        players.delete(playerId);
        console.log(`❌ Player ${playerId} disconnected (${players.size} total)`);
    });
});

// HTTP endpoints for Discord bot
app.post('/send', (req, res) => {
    const { message, sender } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    const formattedMessage = sender ? `📢 ${sender}: ${message}` : `📢 ${message}`;
    console.log(`📤 Sending: "${formattedMessage}" to ${players.size} players`);
    
    let sentCount = 0;
    players.forEach((player) => {
        if (player.ws.readyState === 1) {
            try {
                player.ws.send(JSON.stringify({
                    type: 'message',
                    message: formattedMessage
                }));
                sentCount++;
            } catch (e) {}
        }
    });
    
    res.json({
        success: true,
        message: formattedMessage,
        players_reached: sentCount,
        total_players: players.size
    });
});

app.post('/clear', (req, res) => {
    players.forEach((player) => {
        if (player.ws.readyState === 1) {
            try {
                player.ws.send(JSON.stringify({ type: 'clear' }));
            } catch (e) {}
        }
    });
    res.json({ success: true });
});

app.get('/players', (req, res) => {
    const playerList = [];
    players.forEach((player, id) => {
        playerList.push({ id: id });
    });
    res.json({ total: players.size, players: playerList });
});

app.get('/status', (req, res) => {
    res.json({ 
        status: 'online', 
        players: players.size,
        uptime: process.uptime()
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'VR Messaging Server',
        status: 'online',
        players: players.size
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 URL: ${process.env.RAILWAY_STATIC_URL || 'localhost'}`);
});
