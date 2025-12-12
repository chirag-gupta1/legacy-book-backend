// src/routes/book.routes.ts
import { Router } from "express";
import prisma from "../lib/prisma";
import { generateChapter } from "../services/book.service";
import { verifyBookContent } from "../services/bookVerification.service";
import { regenerateBook } from "../services/bookRegeneration.service";

const router = Router();

/**
 * Generate initial book draft (no persistence)
 */
router.get("/generate/:conversationId", async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { answers: true },
  });

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const chapter = await generateChapter(conversation.answers);
  res.json({ chapter });
});

/**
 * Verify generated content (on-the-fly)
 */
router.get("/verify/:conversationId", async (req, res) => {
  const { conversationId } = req.params;

  const answers = await prisma.answer.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  if (answers.length === 0) {
    return res.status(400).json({ error: "No answers found" });
  }

  const bookText = await generateChapter(answers);

  const report = await verifyBookContent(
    bookText,
    answers.map((a: { response: string }) => a.response)
  );

  res.json(report);
});

/**
 * Regenerate book under user constraints
 * Creates a NEW draft version
 */
router.post("/regenerate/:conversationId", async (req, res) => {
  const { conversationId } = req.params;

  const answers = await prisma.answer.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  if (answers.length === 0) {
    return res.status(400).json({ error: "No answers found" });
  }

  const decisions = await prisma.verificationDecision.findMany({
    where: { conversationId },
  });

  const originalBook = await generateChapter(answers);

  const regenerated = await regenerateBook({
    bookText: originalBook,
    answers: answers.map((a: { response: string }) => a.response),
    decisions,
  });

  const latestVersion = await prisma.bookVersion.findFirst({
    where: { conversationId },
    orderBy: { versionNumber: "desc" },
  });

  const newVersionNumber = latestVersion
    ? latestVersion.versionNumber + 1
    : 1;

  const savedVersion = await prisma.bookVersion.create({
    data: {
      conversationId,
      versionNumber: newVersionNumber,
      content: regenerated,
      status: "DRAFT",
    },
  });

  res.json(savedVersion);
});

/**
 * Verify a specific book version
 */
router.get("/verify/version/:versionId", async (req, res) => {
  const { versionId } = req.params;

  const version = await prisma.bookVersion.findUnique({
    where: { id: versionId },
  });

  if (!version) {
    return res.status(404).json({ error: "Version not found" });
  }

  const answers = await prisma.answer.findMany({
    where: { conversationId: version.conversationId },
    orderBy: { createdAt: "asc" },
  });

  const report = await verifyBookContent(
    version.content,
    answers.map((a: { response: string }) => a.response)
  );

  res.json(report);
});

/**
 * Finalize a verified book version
 */
router.post("/finalize/:versionId", async (req, res) => {
  const { versionId } = req.params;

  const version = await prisma.bookVersion.findUnique({
    where: { id: versionId },
  });

  if (!version) {
    return res.status(404).json({ error: "Version not found" });
  }

  // Demote any previous FINAL version
  await prisma.bookVersion.updateMany({
    where: {
      conversationId: version.conversationId,
      status: "FINAL",
    },
    data: { status: "VERIFIED" },
  });

  const finalized = await prisma.bookVersion.update({
    where: { id: versionId },
    data: { status: "FINAL" },
  });

  res.json(finalized);
});

export default router;
