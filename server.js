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

wss.on('connection', (ws) => {
    const playerId = ++playerIdCounter;
    players.set(playerId, { ws, connectedAt: new Date() });
    console.log(`🎮 Player ${playerId} connected (${players.size} total)`);
    
    ws.on('close', () => {
        players.delete(playerId);
        console.log(`❌ Player ${playerId} disconnected (${players.size} total)`);
    });
});

app.post('/send', (req, res) => {
    const { message, sender } = req.body;
    const formatted = sender ? `📢 ${sender}: ${message}` : `📢 ${message}`;
    
    let sentCount = 0;
    players.forEach((player) => {
        if (player.ws.readyState === 1) {
            player.ws.send(JSON.stringify({
                type: 'message',
                message: formatted,
                sender: sender || 'Admin'
            }));
            sentCount++;
        }
    });
    
    res.json({ success: true, players_reached: sentCount });
});

app.get('/status', (req, res) => {
    res.json({ status: 'online', players: players.size });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});
