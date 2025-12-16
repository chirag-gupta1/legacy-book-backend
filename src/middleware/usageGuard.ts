import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

export function enforceUsageLimits(
  type: "generate" | "verify" | "regenerate"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const conversationId =
      req.params.conversationId || req.params.versionId;

    if (!conversationId || !req.user) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: req.user.id,
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const limits = {
      generate: conversation.generationCount < 1,
      verify: conversation.verificationCount < 3,
      regenerate: conversation.regenerationCount < 3,
    };

    if (!limits[type]) {
      return res.status(429).json({
        error: "Usage limit reached",
        limitType: type,
      });
    }

    // Attach for later increment
    (req as any).conversation = conversation;
    next();
  };
}
