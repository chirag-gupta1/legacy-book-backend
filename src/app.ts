import "dotenv/config";
import express from "express";
import cors from "cors";
import prisma from "./lib/prisma";

import interviewRoutes from "./routes/interview.routes";
import bookRoutes from "./routes/book.routes";
import conversationRoutes from "./routes/conversation.routes";
import { strictLimiter } from "./middleware/rateLimit";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "200kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use("/conversation", conversationRoutes);
app.use("/interview", strictLimiter, interviewRoutes);
app.use("/book", strictLimiter, bookRoutes);

export default app;
