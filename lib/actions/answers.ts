"use server";

import { db } from "@/lib/db";
import { studentAnswers, cardQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function submitAnswer(
  questionId: string,
  answer: unknown,
  deviceType: string
) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return { error: "未授权" };

  // Check if already answered
  const [existing] = await db
    .select()
    .from(studentAnswers)
    .where(
      and(
        eq(studentAnswers.questionId, questionId),
        eq(studentAnswers.studentId, user.id)
      )
    );

  if (existing) return { error: "已提交，不能重复作答" };

  // Get question for type-specific scoring
  const [question] = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.id, questionId));

  if (!question) return { error: "题目不存在" };

  let score: number | null = null;

  // Multiple-choice: auto-grade
  if (question.type === "multiple_choice") {
    const studentAnswer = answer as string[];
    const correctAnswer = JSON.parse(
      question.correctAnswer || "[]"
    ) as string[];
    const isCorrect =
      studentAnswer.length === correctAnswer.length &&
      studentAnswer.every((a) => correctAnswer.includes(a)) &&
      correctAnswer.every((a) => studentAnswer.includes(a));
    score = isCorrect ? question.score : 0;
  }

  // Self-assessment: score is the star rating (stored directly, no point value)
  if (question.type === "self_assessment") {
    const sa = answer as { stars?: number; comment?: string };
    score = sa.stars ?? 0;
  }

  const [result] = await db
    .insert(studentAnswers)
    .values({
      questionId,
      studentId: user.id,
      answer,
      score,
      deviceType,
    })
    .returning();

  return { success: true, answerId: result.id, score };
}
