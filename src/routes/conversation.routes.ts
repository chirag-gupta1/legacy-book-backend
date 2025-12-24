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
  const userId = req.user!.id;

   // ✅ ENSURE USER EXISTS
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: "Unknown",          // can be updated later
      email: `${userId}@clerk`, // placeholder
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: title || "My Legacy Book",
      currentSection: "childhood",
      questionIndex: 0,
      status: "active",
    },
  });

  res.status(201).json({ conversation });
});

export default router;
