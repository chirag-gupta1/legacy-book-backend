// src/routes/book.routes.ts
import { Router } from "express";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { generateChapter } from "../services/book.service";
import { verifyBookContent } from "../services/bookVerification.service";
import { regenerateBook } from "../services/bookRegeneration.service";
import { requireAuth } from "../middleware/auth.middleware";
import { enforceUsageLimits } from "../middleware/usageGuard";

const router = Router();

// 🔐 Protect all book routes
router.use(requireAuth);

/**
 * Generate initial book draft (no persistence)
 */
router.get(
  "/generate/:conversationId",
  enforceUsageLimits("generate"),
  async (req, res) => {
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: req.user!.id,
      },
      include: { answers: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const chapter = await generateChapter(conversation.answers);

    // ✅ Increment usage AFTER success
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { generationCount: { increment: 1 } },
    });

    res.json({ chapter });
  }
);

/**
 * Verify generated content (on-the-fly)
 */
router.get(
  "/verify/:conversationId",
  enforceUsageLimits("verify"),
  async (req, res) => {
    const { conversationId } = req.params;

    const answers: Prisma.AnswerGetPayload<{
      select: { response: true };
    }>[] = await prisma.answer.findMany({
      where: {
        conversationId,
        conversation: {
          userId: req.user!.id,
        },
      },
      orderBy: { createdAt: "asc" },
      select: { response: true },
    });

    if (answers.length === 0) {
      return res.status(400).json({ error: "No answers found" });
    }

    const bookText = await generateChapter(
      answers.map(a => ({ response: a.response }))
    );

    const report = await verifyBookContent(
      bookText,
      answers.map(a => a.response)
    );

    // ✅ Increment usage AFTER success
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { verificationCount: { increment: 1 } },
    });

    res.json(report);
  }
);

/**
 * Regenerate book under user constraints
 * Creates a NEW draft version
 */
router.post(
  "/regenerate/:conversationId",
  enforceUsageLimits("regenerate"),
  async (req, res) => {
    const { conversationId } = req.params;

    const answers: Prisma.AnswerGetPayload<{
      select: { response: true };
    }>[] = await prisma.answer.findMany({
      where: {
        conversationId,
        conversation: {
          userId: req.user!.id,
        },
      },
      orderBy: { createdAt: "asc" },
      select: { response: true },
    });

    if (answers.length === 0) {
      return res.status(400).json({ error: "No answers found" });
    }

    const decisions = await prisma.verificationDecision.findMany({
      where: {
        conversationId,
        conversation: {
          userId: req.user!.id,
        },
      },
    });

    const originalBook = await generateChapter(
      answers.map(a => ({ response: a.response }))
    );

    const regenerated = await regenerateBook({
      bookText: originalBook,
      answers: answers.map(a => a.response),
      decisions,
    });

    const latestVersion = await prisma.bookVersion.findFirst({
      where: {
        conversationId,
        conversation: {
          userId: req.user!.id,
        },
      },
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

    // ✅ Increment usage AFTER success
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { regenerationCount: { increment: 1 } },
    });

    res.json(savedVersion);
  }
);

/**
 * Verify a specific book version
 */
router.get(
  "/verify/version/:versionId",
  enforceUsageLimits("verify"),
  async (req, res) => {
    const { versionId } = req.params;

    const version = await prisma.bookVersion.findFirst({
      where: {
        id: versionId,
        conversation: {
          userId: req.user!.id,
        },
      },
    });

    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    const answers: Prisma.AnswerGetPayload<{
      select: { response: true };
    }>[] = await prisma.answer.findMany({
      where: {
        conversationId: version.conversationId,
        conversation: {
          userId: req.user!.id,
        },
      },
      orderBy: { createdAt: "asc" },
      select: { response: true },
    });

    const report = await verifyBookContent(
      version.content,
      answers.map(a => a.response)
    );

    await prisma.conversation.update({
      where: { id: version.conversationId },
      data: { verificationCount: { increment: 1 } },
    });

    res.json(report);
  }
);

/**
 * Finalize a verified book version
 */
router.post("/finalize/:versionId", async (req, res) => {
  const { versionId } = req.params;

  const version = await prisma.bookVersion.findFirst({
    where: {
      id: versionId,
      conversation: {
        userId: req.user!.id,
      },
    },
  });

  if (!version) {
    return res.status(404).json({ error: "Version not found" });
  }

  // Demote any previous FINAL version
  await prisma.bookVersion.updateMany({
    where: {
      conversationId: version.conversationId,
      status: "FINAL",
      conversation: {
        userId: req.user!.id,
      },
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
