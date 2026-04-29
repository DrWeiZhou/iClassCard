import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { db } from "@/lib/db";
import {
  discussionCards,
  discussionSessions,
  llmModels,
  classrooms,
  courses,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { fillTemplate } from "@/lib/ai/prompts";
import { getTemplateOrDefault } from "@/lib/actions/templates";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return new Response("未授权", { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== "student") {
    return new Response("未授权", { status: 401 });
  }

  const body = await request.json();
  const sessionId = body.sessionId;
  const uiMessages: UIMessage[] = body.messages;

  // Get session
  const [session] = await db
    .select()
    .from(discussionSessions)
    .where(
      and(
        eq(discussionSessions.id, sessionId),
        eq(discussionSessions.studentId, user.id)
      )
    );
  if (!session) return new Response("会话不存在", { status: 404 });
  if (session.status === "completed") {
    return new Response("交流已结束", { status: 400 });
  }

  // Get card
  const [card] = await db
    .select()
    .from(discussionCards)
    .where(eq(discussionCards.id, session.cardId));
  if (!card) return new Response("交流卡不存在", { status: 404 });

  // Get teacher's default model via single JOIN query
  const [modelResult] = await db
    .select({ model: llmModels, teacherId: courses.teacherId })
    .from(classrooms)
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .innerJoin(llmModels, and(
      eq(llmModels.teacherId, courses.teacherId),
      eq(llmModels.isDefault, true)
    ))
    .where(eq(classrooms.id, card.classroomId));
  const model = modelResult?.model;
  const teacherId = modelResult?.teacherId;
  if (!model) return new Response("教师未配置默认模型", { status: 400 });

  // Get template
  const template = await getTemplateOrDefault(
    teacherId,
    "discussion",
    "evaluation"
  );

  const systemPrompt = fillTemplate(template, {
    讨论交流主题: card.topic,
    学习参与度满分: String(card.participationMaxScore),
    学习态度满分: String(card.attitudeMaxScore),
    学习能力满分: String(card.abilityMaxScore),
    学习情感满分: String(card.emotionMaxScore),
    创新能力满分: String(card.innovationMaxScore),
  });

  const openai = createOpenAI({ baseURL: model.baseUrl, apiKey: model.apiKey });

  // Convert UI messages to model messages
  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: openai(model.modelName),
    system: systemPrompt,
    messages: modelMessages,
    async onFinish({ text }) {
      // Save messages + assistant reply to session
      const storedMessages = uiMessages.map((m) => ({
        role: m.role,
        content: m.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join(""),
      }));
      storedMessages.push({ role: "assistant", content: text });
      await db
        .update(discussionSessions)
        .set({ messages: storedMessages, updatedAt: new Date() })
        .where(eq(discussionSessions.id, sessionId));
    },
  });

  return result.toUIMessageStreamResponse();
}
