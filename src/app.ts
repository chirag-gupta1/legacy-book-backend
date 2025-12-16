import "dotenv/config";
import express from "express";
import cors from "cors";

import prisma from "./lib/prisma";
import interviewRoutes from "./routes/interview.routes";
import bookRoutes from "./routes/book.routes";
import conversationRoutes from "./routes/conversation.routes";
import { strictLimiter } from "./middleware/rateLimit";

const app = express();

app.use("/book", strictLimiter);
app.use("/interview", strictLimiter);
// CORS (tighten origin later when frontend domain is fixed)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Body limit prevents huge payloads + cost blowups
app.use(express.json({ limit: "200kb" }));

// Health = process is alive (no DB)
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// Ready = DB reachable
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// Routes
app.use("/conversation", conversationRoutes);
app.use("/interview", interviewRoutes);
app.use("/book", bookRoutes);

export default app;