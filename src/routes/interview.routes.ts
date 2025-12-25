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
  try {
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: req.user!.id,
      },
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

    return res.json({ question: next });
  } catch (err) {
    console.error("GET /interview/question crashed", err);
    return res.status(500).json({ error: "Failed to load question" });
  }
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

    // 🧠 AI analysis (fail-soft)
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
        // fail soft
      }
    }

    // 💾 Save answer
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

    // ➕ Advance interview state (SECTION-SAFE)
    const questionsData = require("../data/questions.data");
    const sections: string[] = Object.keys(
      questionsData.LIFE_SECTIONS
    );

    const currentSection = conversation.currentSection;

    // 🔒 Improvement #1 — hard guard against corrupted section
    if (!questionsData.LIFE_SECTIONS[currentSection]) {
      console.error("Invalid interview section detected", {
        conversationId,
        currentSection,
      });

      return res.status(500).json({
        error: "Interview state corrupted. Please restart.",
      });
    }

    const sectionQuestions =
      questionsData.LIFE_SECTIONS[currentSection] || [];

    let nextQuestionIndex = conversation.questionIndex + 1;
    let nextSection = currentSection;

    // Move to next section if current is exhausted
    if (nextQuestionIndex >= sectionQuestions.length) {
      const currentSectionIndex = sections.indexOf(currentSection);
      const followingSection = sections[currentSectionIndex + 1];

      if (followingSection) {
        nextSection = followingSection;
        nextQuestionIndex = 0;
      }
    }

    // 🔒 Improvement #2 — explicit end-of-interview handling
    const isLastSection =
      nextQuestionIndex >= sectionQuestions.length &&
      !sections[sections.indexOf(currentSection) + 1];

    if (isLastSection) {
      nextQuestionIndex = Number.MAX_SAFE_INTEGER;
    }

    // Persist progression
    await prisma.conversation.update({
      where: {
        id: conversation.id,
        userId: req.user!.id,
      },
      data: {
        currentSection: nextSection,
        questionIndex: nextQuestionIndex,
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
