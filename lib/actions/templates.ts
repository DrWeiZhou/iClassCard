"use server";

import { db } from "@/lib/db";
import { promptTemplates, teachers } from "@/lib/db/schema";
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

export type RatingSettings = {
  cardHigh: [number, number];
  cardMid: [number, number];
  cardLow: [number, number];
  discussionHigh: [number, number];
  discussionMid: [number, number];
  discussionLow: [number, number];
};

const DEFAULT_RATING_SETTINGS: RatingSettings = {
  cardHigh: [86, 100],
  cardMid: [70, 85],
  cardLow: [0, 69],
  discussionHigh: [86, 100],
  discussionMid: [70, 85],
  discussionLow: [0, 69],
};

export async function getRatingSettings(): Promise<RatingSettings> {
  const user = await requireTeacher();
  const [teacher] = await db
    .select({ ratingSettings: teachers.ratingSettings })
    .from(teachers)
    .where(eq(teachers.id, user.id));

  if (teacher?.ratingSettings) {
    return teacher.ratingSettings as RatingSettings;
  }
  return DEFAULT_RATING_SETTINGS;
}

export async function saveRatingSettings(settings: RatingSettings) {
  const user = await requireTeacher();
  await db
    .update(teachers)
    .set({ ratingSettings: settings, updatedAt: new Date() })
    .where(eq(teachers.id, user.id));

  revalidatePath("/teacher/templates");
  return { success: true };
}

export async function getRatingSettingsByTeacherId(
  teacherId: string
): Promise<RatingSettings> {
  const [teacher] = await db
    .select({ ratingSettings: teachers.ratingSettings })
    .from(teachers)
    .where(eq(teachers.id, teacherId));

  if (teacher?.ratingSettings) {
    return teacher.ratingSettings as RatingSettings;
  }
  return DEFAULT_RATING_SETTINGS;
}
