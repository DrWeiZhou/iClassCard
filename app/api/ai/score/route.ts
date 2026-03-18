import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { db } from "@/lib/db";
import {
  cardQuestions,
  studentAnswers,
  llmModels,
  learningCards,
  classrooms,
  courses,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { fillTemplate } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { questionId, answerId } = await request.json();

  // Get the question
  const [question] = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.id, questionId));
  if (!question || !question.gradingPrompt) {
    return NextResponse.json({ error: "无打分模板" }, { status: 400 });
  }

  // Get the student's answer
  const [answer] = await db
    .select()
    .from(studentAnswers)
    .where(eq(studentAnswers.id, answerId));
  if (!answer) {
    return NextResponse.json({ error: "答案不存在" }, { status: 404 });
  }

  // Find the teacher's default model via card -> classroom -> course -> teacher
  const [card] = await db
    .select()
    .from(learningCards)
    .where(eq(learningCards.id, question.cardId));
  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.id, card.classroomId));
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, classroom.courseId));
  const [model] = await db
    .select()
    .from(llmModels)
    .where(
      and(eq(llmModels.teacherId, course.teacherId), eq(llmModels.isDefault, true))
    );

  if (!model) {
    return NextResponse.json({ error: "教师未配置默认模型" }, { status: 400 });
  }

  // Build prompt
  const studentAnswerText =
    typeof answer.answer === "string"
      ? answer.answer
      : JSON.stringify(answer.answer);

  const prompt = fillTemplate(question.gradingPrompt, {
    题干: question.title,
    标准答案: question.correctAnswer || "",
    学生答案: studentAnswerText,
  });

  // Call LLM
  const openai = createOpenAI({ baseURL: model.baseUrl, apiKey: model.apiKey });
  const { text } = await generateText({
    model: openai(model.modelName),
    prompt,
  });

  // Parse score (0-10)
  const llmScore = Math.min(10, Math.max(0, parseInt(text.trim()) || 0));
  const awardedScore = Math.round((llmScore / 10) * question.score);

  // Update answer
  await db
    .update(studentAnswers)
    .set({ score: awardedScore })
    .where(eq(studentAnswers.id, answerId));

  return NextResponse.json({ score: awardedScore, llmScore });
}
