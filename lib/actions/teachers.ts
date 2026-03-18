"use server";

import { db } from "@/lib/db";
import { teachers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getTeacherProfile() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const [teacher] = await db.select().from(teachers).where(eq(teachers.id, user.id));
  return teacher ?? null;
}

export async function updateTeacherProfile(prevState: unknown, formData: FormData) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  const name = formData.get("name") as string;
  const college = formData.get("college") as string;
  const major = formData.get("major") as string;

  if (!name || !college || !major) {
    return { error: "请填写所有必填字段" };
  }

  await db.update(teachers).set({
    name, college, major, updatedAt: new Date(),
  }).where(eq(teachers.id, user.id));

  revalidatePath("/teacher/profile");
  return { success: true };
}
