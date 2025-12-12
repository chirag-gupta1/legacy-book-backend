import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

/**
 * Start a new conversation (biography project)
 */
router.post("/start", async (req, res) => {
  const { userId, title } = req.body;

  if (!userId) return res.status(400).json({ error: "userId is required" });

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: title || "My Legacy Book",
      currentSection: "childhood",
      questionIndex: 0
    }
  });

  res.json({ conversation });
});

export default router;
