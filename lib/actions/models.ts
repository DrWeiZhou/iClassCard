"use server";

import { db } from "@/lib/db";
import { llmModels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const modelSchema = z.object({
  displayName: z.string().min(1, "请输入模型显示名"),
  modelName: z.string().min(1, "请输入模型名"),
  baseUrl: z.string().url("请输入有效的 Base URL"),
  apiKey: z.string().min(1, "请输入 API Key"),
});

const updateModelSchema = z.object({
  displayName: z.string().min(1, "请输入模型显示名"),
  modelName: z.string().min(1, "请输入模型名"),
  baseUrl: z.string().url("请输入有效的 Base URL"),
  apiKey: z.string().optional(),
});

async function requireTeacher() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    throw new Error("未授权");
  }
  return user;
}

export async function getModels() {
  const user = await requireTeacher();
  return db
    .select()
    .from(llmModels)
    .where(eq(llmModels.teacherId, user.id))
    .orderBy(llmModels.createdAt);
}

export async function createModel(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const user = await requireTeacher();

  const parsed = modelSchema.safeParse({
    displayName: formData.get("displayName"),
    modelName: formData.get("modelName"),
    baseUrl: formData.get("baseUrl"),
    apiKey: formData.get("apiKey"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { displayName, modelName, baseUrl, apiKey } = parsed.data;

  // Check if this is the teacher's first model
  const existing = await db
    .select()
    .from(llmModels)
    .where(eq(llmModels.teacherId, user.id));

  const isFirst = existing.length === 0;

  await db.insert(llmModels).values({
    teacherId: user.id,
    displayName,
    modelName,
    baseUrl,
    apiKey,
    isDefault: isFirst,
  });

  revalidatePath("/teacher/models");
  return { success: true };
}

export async function updateModel(
  id: string,
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const user = await requireTeacher();

  const parsed = updateModelSchema.safeParse({
    displayName: formData.get("displayName"),
    modelName: formData.get("modelName"),
    baseUrl: formData.get("baseUrl"),
    apiKey: (formData.get("apiKey") as string) || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { displayName, modelName, baseUrl, apiKey } = parsed.data;

  // Verify ownership
  const [model] = await db
    .select()
    .from(llmModels)
    .where(and(eq(llmModels.id, id), eq(llmModels.teacherId, user.id)));

  if (!model) {
    return { error: "模型不存在" };
  }

  const updateData: Record<string, unknown> = {
    displayName,
    modelName,
    baseUrl,
  };

  // Only update apiKey if provided
  if (apiKey) {
    updateData.apiKey = apiKey;
  }

  await db
    .update(llmModels)
    .set(updateData)
    .where(eq(llmModels.id, id));

  revalidatePath("/teacher/models");
  return { success: true };
}

export async function deleteModel(id: string) {
  const user = await requireTeacher();

  // Verify ownership
  const [model] = await db
    .select()
    .from(llmModels)
    .where(and(eq(llmModels.id, id), eq(llmModels.teacherId, user.id)));

  if (!model) {
    return { error: "模型不存在" };
  }

  await db.delete(llmModels).where(eq(llmModels.id, id));

  revalidatePath("/teacher/models");
  return { success: true };
}

export async function setDefaultModel(id: string) {
  const user = await requireTeacher();

  // Verify ownership
  const [model] = await db
    .select()
    .from(llmModels)
    .where(and(eq(llmModels.id, id), eq(llmModels.teacherId, user.id)));

  if (!model) {
    return { error: "模型不存在" };
  }

  // Unset all defaults for this teacher
  await db
    .update(llmModels)
    .set({ isDefault: false })
    .where(eq(llmModels.teacherId, user.id));

  // Set this one as default
  await db
    .update(llmModels)
    .set({ isDefault: true })
    .where(eq(llmModels.id, id));

  revalidatePath("/teacher/models");
  return { success: true };
}
