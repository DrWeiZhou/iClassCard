import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { db } from "@/lib/db";
import {
  lessonPlans,
  lessonPlanSections,
  cardQuestions,
  classrooms,
  courses,
  llmModels,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { questionTitle, classroomId, questionId } = await request.json();

  if (!questionTitle || !classroomId || !questionId) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  // Get lesson plan sections for this classroom
  const [plan] = await db
    .select()
    .from(lessonPlans)
    .where(eq(lessonPlans.classroomId, classroomId));

  if (!plan) {
    return NextResponse.json({ matchedSectionId: null, matchedHeadingText: null });
  }

  const sections = await db
    .select()
    .from(lessonPlanSections)
    .where(eq(lessonPlanSections.lessonPlanId, plan.id))
    .orderBy(lessonPlanSections.sectionOrder);

  if (sections.length === 0) {
    return NextResponse.json({ matchedSectionId: null, matchedHeadingText: null });
  }

  // Resolve teacher's default LLM: classrooms → courses → llm_models
  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.id, classroomId));
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
    return NextResponse.json({ error: "请先配置默认AI模型" }, { status: 400 });
  }

  // Build the matching prompt
  const headingList = sections
    .map((s, i) => `${i + 1}. ${s.headingText}`)
    .join("\n");

  const prompt = `你是一个教案标题匹配助手。给定一个学习内容名称和一组教案标题，找出最匹配的标题。

学习内容名称：${questionTitle}

教案标题列表：
${headingList}

请返回最匹配标题的序号(从1开始)。如果没有合适的匹配，返回0。只返回数字。`;

  try {
    const openai = createOpenAI({ baseURL: model.baseUrl, apiKey: model.apiKey });
    const { text } = await generateText({
      model: openai(model.modelName),
      prompt,
    });

    // Parse the response — extract first integer
    const match = text.trim().match(/\d+/);
    const index = match ? parseInt(match[0]) : 0;

    let matchedSectionId: string | null = null;
    let matchedHeadingText: string | null = null;

    if (index > 0 && index <= sections.length) {
      matchedSectionId = sections[index - 1].id;
      matchedHeadingText = sections[index - 1].headingText;
    }

    // Update the question's matched_section_id
    await db
      .update(cardQuestions)
      .set({ matchedSectionId })
      .where(eq(cardQuestions.id, questionId));

    return NextResponse.json({
      success: true,
      matchedSectionId,
      matchedHeadingText,
    });
  } catch (error) {
    console.error("AI matching error:", error);

    // Set matched_section_id to null on failure
    await db
      .update(cardQuestions)
      .set({ matchedSectionId: null })
      .where(eq(cardQuestions.id, questionId));

    return NextResponse.json({ error: "AI匹配失败" }, { status: 500 });
  }
}
