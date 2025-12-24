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

  const next = getNextQuestion({
    currentSection: conversation.currentSection as any,
    questionIndex: conversation.questionIndex,
  });

  // ✅ Interview finished
  if (!next) {
    return res.json({ message: "Interview complete" });
  }

  // ✅ Persist section change if needed
  if (
    conversation.questionIndex >=
    (require("../data/questions.data").LIFE_SECTIONS[
      conversation.currentSection as any
    ]?.length ?? 0)
  ) {
    const keys = Object.keys(
      require("../data/questions.data").LIFE_SECTIONS
    );
    const currentIndex = keys.indexOf(conversation.currentSection);
    const nextSection = keys[currentIndex + 1];

    if (nextSection) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          currentSection: nextSection,
          questionIndex: 0,
        },
      });
    }
  }

  return res.json({ question: next });
});


/**
 * POST an answer for the conversation
 */
router.post("/answer/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { response } = req.body;

    if (!response || typeof response !== "string") {
      return res.status(400).json({ error: "Response is required" });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: req.user!.id,
      },
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

    // 🧠 AI analysis (SAFE)
    let importanceScore: number | null = null;
    let tags: string[] | null = null;
    let followUpQuestion: string | null = null;

    const MIN_LENGTH_FOR_AI = 12;

    if (response.trim().length >= MIN_LENGTH_FOR_AI) {
      try {
        const analysis = await analyzeAnswerWithAI(
          currentQuestion,
          response
        );

        importanceScore = analysis?.importanceScore ?? null;
        tags = analysis?.tags ?? null;
        followUpQuestion =
          typeof analysis?.followUpQuestion === "string" &&
          analysis.followUpQuestion.trim()
            ? analysis.followUpQuestion
            : null;
      } catch (err) {
        console.error("AI analysis failed", {
          conversationId,
          currentQuestion,
          response,
          err,
        });
        // fail soft: proceed without AI data
      }
    }

    // 💾 Save answer ALWAYS
    const created = await prisma.answer.create({
      data: {
        conversationId: conversation.id,
        question: currentQuestion,
        response,
        importanceScore,
        tags,
        followUp: followUpQuestion,
      },
    });

    // ➕ Advance conversation index
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
      followUpQuestion,
      answer: created,
    });
  } catch (err) {
    console.error("Interview answer route crashed", err);

    return res.status(500).json({
      error: "Could not save answer. Please try again.",
    });
  }
});

export default router;