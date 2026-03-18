"use server";

import { db } from "@/lib/db";
import { promptTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DEFAULT_TEMPLATES } from "@/lib/ai/default-templates";

async function requireTeacher() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    throw new Error("未授权");
  }
  return user;
}

export async function getTemplates() {
  const user = await requireTeacher();
  return db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.teacherId, user.id));
}

export async function getTemplateOrDefault(
  teacherId: string,
  questionType: string,
  templateKind: string
): Promise<string> {
  const [template] = await db
    .select()
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.teacherId, teacherId),
        eq(promptTemplates.questionType, questionType),
        eq(promptTemplates.templateKind, templateKind)
      )
    );

  if (template) return template.content;
  return DEFAULT_TEMPLATES[questionType]?.[templateKind] ?? "";
}

export async function saveTemplate(
  questionType: string,
  templateKind: string,
  content: string
) {
  const user = await requireTeacher();

  await db
    .insert(promptTemplates)
    .values({
      teacherId: user.id,
      questionType,
      templateKind,
      content,
    })
    .onConflictDoUpdate({
      target: [
        promptTemplates.teacherId,
        promptTemplates.questionType,
        promptTemplates.templateKind,
      ],
      set: { content, updatedAt: new Date() },
    });

  revalidatePath("/teacher/templates");
  return { success: true };
}
