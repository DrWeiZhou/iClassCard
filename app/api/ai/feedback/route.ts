import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
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
  if (!token) return new Response("未授权", { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== "student") {
    return new Response("未授权", { status: 401 });
  }

  const { questionId, answerId } = await request.json();

  const [question] = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.id, questionId));
  if (!question || !question.feedbackPrompt) {
    return new Response("无批改模板", { status: 400 });
  }

  const [answer] = await db
    .select()
    .from(studentAnswers)
    .where(eq(studentAnswers.id, answerId));
  if (!answer) return new Response("答案不存在", { status: 404 });

  // Find teacher's default model
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
      and(
        eq(llmModels.teacherId, course.teacherId),
        eq(llmModels.isDefault, true)
      )
    );

  if (!model) return new Response("教师未配置默认模型", { status: 400 });

  const studentAnswerText =
    typeof answer.answer === "string"
      ? answer.answer
      : JSON.stringify(answer.answer);

  const prompt = fillTemplate(question.feedbackPrompt, {
    题干: question.title,
    标准答案: question.correctAnswer || "",
    学生答案: studentAnswerText,
    选项: JSON.stringify(question.options || []),
    得分: String(answer.score ?? 0),
  });

  const openai = createOpenAI({ baseURL: model.baseUrl, apiKey: model.apiKey });
  const result = streamText({
    model: openai(model.modelName),
    prompt,
    async onFinish({ text }) {
      // Persist feedback to database after streaming completes
      await db
        .update(studentAnswers)
        .set({ aiFeedback: text })
        .where(eq(studentAnswers.id, answerId));
    },
  });

  return result.toTextStreamResponse();
}
