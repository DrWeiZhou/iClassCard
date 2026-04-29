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
import { DEFAULT_TEMPLATES } from "@/lib/ai/default-templates";

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
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 400 });
  }
  const gradingPrompt = question.gradingPrompt || DEFAULT_TEMPLATES[question.type]?.scoring;
  if (!gradingPrompt) {
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

  // Find the teacher's default model via single JOIN query
  const [modelResult] = await db
    .select({ model: llmModels })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .innerJoin(llmModels, and(
      eq(llmModels.teacherId, courses.teacherId),
      eq(llmModels.isDefault, true)
    ))
    .where(eq(learningCards.id, question.cardId));
  const model = modelResult?.model;

  if (!model) {
    return NextResponse.json({ error: "教师未配置默认模型" }, { status: 400 });
  }

  // Build prompt
  const studentAnswerText =
    typeof answer.answer === "string"
      ? answer.answer
      : JSON.stringify(answer.answer);

  const prompt = fillTemplate(gradingPrompt, {
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
