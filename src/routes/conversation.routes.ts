// src/routes/conversation.routes.ts
import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// 🔐 Protect all conversation routes
router.use(requireAuth);

/**
 * Start a new conversation (biography project)
 */
router.post("/start", async (req, res) => {
  const { title } = req.body;

  const conversation = await prisma.conversation.create({
    data: {
      userId: req.user!.id, // 👈 derived from Clerk JWT
      title: title || "My Legacy Book",
      currentSection: "childhood",
      questionIndex: 0,
    },
  });

  res.json({ conversation });
});

export default router;
