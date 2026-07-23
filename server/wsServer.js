/**
 * Standalone WebSocket server for Yjs document synchronization.
 *
 * Each PRD session gets its own "room" (identified by sessionId).
 * This enables real-time collaborative editing between multiple users.
 *
 * Usage:
 *   node server/wsServer.js
 *   - or -
 *   npm run dev:ws
 *
 * The server listens on port 1234 by default (WS_PORT env variable).
 */

const WebSocket = require("ws");
const http = require("http");
const { setupWSConnection } = require("y-websocket/bin/utils");

const PORT = parseInt(process.env.WS_PORT || "1234", 10);
const HOST = process.env.WS_HOST || "0.0.0.0";

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("AiNgePRD Collaboration Server is running");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  // The room name is extracted from the URL path: /roomName
  // y-websocket client sends it as ws://host:port/roomName
  setupWSConnection(ws, req);
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 AiNgePRD WebSocket server running at ws://${HOST}:${PORT}`);
  console.log(`   Rooms are created on-the-fly per PRD session.`);
});
