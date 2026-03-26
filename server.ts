import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  const PORT = 3000;

  // Store active calls and their participants
  const callParticipants = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws) => {
    let currentCallId: string | null = null;
    let currentUserId: string | null = null;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "join") {
          currentCallId = data.callId;
          currentUserId = data.userId;
          
          if (!callParticipants.has(currentCallId!)) {
            callParticipants.set(currentCallId!, new Set());
          }
          callParticipants.get(currentCallId!)!.add(ws);
          console.log(`User ${currentUserId} joined call ${currentCallId}`);
        }

        if (data.type === "audio" && currentCallId) {
          // Relay audio to other participants in the same call
          const participants = callParticipants.get(currentCallId);
          if (participants) {
            participants.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "audio",
                  userId: currentUserId,
                  data: data.data
                }));
              }
            });
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.on("close", () => {
      if (currentCallId && callParticipants.has(currentCallId)) {
        callParticipants.get(currentCallId)!.delete(ws);
        if (callParticipants.get(currentCallId)!.size === 0) {
          callParticipants.delete(currentCallId);
        }
      }
      console.log(`User ${currentUserId} left call ${currentCallId}`);
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
