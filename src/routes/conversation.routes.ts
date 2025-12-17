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
  const clerkUserId = req.user!.id;
  const { title } = req.body;

  // ✅ Ensure user exists
  const user = await prisma.user.upsert({
    where: { id: clerkUserId },
    update: {},
    create: {
      id: clerkUserId,
      email: req.user!.email, // make sure this exists in auth middleware
      name: req.user!.name ?? "User",
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: title || "My Legacy Book",
      currentSection: "childhood",
      questionIndex: 0,
      status: "active",
    },
  });

  res.status(201).json({ conversation });
});


export default router;
