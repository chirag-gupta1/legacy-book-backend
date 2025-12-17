// src/routes/interview.routes.ts
import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { getNextQuestion } from "../services/conversation.service";
import { analyzeAnswerWithAI } from "../services/aiAnalysis.service";

const router = Router();

// 🔐 Protect all interview routes
router.use(requireAuth);

/**
 * GET next interview question
 */
router.get("/question/:conversationId", async (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ error: "conversationId is required" });
  }

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

  const question = getNextQuestion({
    currentSection: conversation.currentSection as any,
    questionIndex: conversation.questionIndex,
  });

  if (!question) {
    return res.json({ message: "Interview complete" });
  }

  return res.json({ question });
});

/**
 * POST an answer for the conversation
 */
router.post("/answer/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const { response } = req.body;

  if (!response) {
    return res.status(400).json({ error: "Response is required" });
  }

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

  const currentQuestion = getNextQuestion({
    currentSection: conversation.currentSection as any,
    questionIndex: conversation.questionIndex,
  });

  if (!currentQuestion) {
    return res.json({ message: "Interview complete" });
  }

  // 🤖 AI analysis
  const analysis = await analyzeAnswerWithAI(currentQuestion, response);

  // 💾 Save answer
  const created = await prisma.answer.create({
    data: {
      conversationId: conversation.id,
      question: currentQuestion,
      response,
      importanceScore: analysis.importanceScore,
      tags: analysis.tags,
      followUp: analysis.followUpQuestion ?? null,
    },
  });

  // ➕ Advance conversation index (only for this user's conversation)
  await prisma.conversation.update({
    where: {
      id: conversation.id,
      userId: req.user!.id,
    },
    data: {
      questionIndex: conversation.questionIndex + 1,
    },
  });

  return res.json({
    message: "Answer saved",
    followUpQuestion: analysis.followUpQuestion || null,
    answer: created,
  });
});

export default router;