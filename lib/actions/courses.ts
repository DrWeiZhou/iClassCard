"use server";

import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const courseSchema = z.object({
  year: z.string().min(1, "请输入学年"),
  semester: z.string().min(1, "请选择学期"),
  name: z.string().min(1, "请输入课程名称"),
  studentCount: z.coerce.number().int().min(0, "人数不能为负数"),
  classComposition: z.string().optional(),
});

async function requireTeacher() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    throw new Error("未授权");
  }
  return user;
}

export async function getCourses() {
  const user = await requireTeacher();
  return db
    .select()
    .from(courses)
    .where(eq(courses.teacherId, user.id))
    .orderBy(desc(courses.createdAt));
}

export async function getCourse(id: string) {
  const user = await requireTeacher();
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.teacherId, user.id)));

  if (!course) {
    return null;
  }

  return course;
}

export async function createCourse(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const user = await requireTeacher();

  const parsed = courseSchema.safeParse({
    year: formData.get("year"),
    semester: formData.get("semester"),
    name: formData.get("name"),
    studentCount: formData.get("studentCount"),
    classComposition: formData.get("classComposition"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { year, semester, name, studentCount, classComposition } = parsed.data;

  await db.insert(courses).values({
    teacherId: user.id,
    year,
    semester,
    name,
    studentCount,
    classComposition: classComposition || null,
  });

  revalidatePath("/teacher/courses");
  return { success: true };
}

export async function updateCourse(
  id: string,
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const user = await requireTeacher();

  const parsed = courseSchema.safeParse({
    year: formData.get("year"),
    semester: formData.get("semester"),
    name: formData.get("name"),
    studentCount: formData.get("studentCount"),
    classComposition: formData.get("classComposition"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify ownership
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.teacherId, user.id)));

  if (!course) {
    return { error: "课程不存在" };
  }

  const { year, semester, name, studentCount, classComposition } = parsed.data;

  await db
    .update(courses)
    .set({
      year,
      semester,
      name,
      studentCount,
      classComposition: classComposition || null,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, id));

  revalidatePath("/teacher/courses");
  return { success: true };
}

export async function deleteCourse(id: string) {
  const user = await requireTeacher();

  // Verify ownership
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.teacherId, user.id)));

  if (!course) {
    return { error: "课程不存在" };
  }

  await db.delete(courses).where(eq(courses.id, id));

  revalidatePath("/teacher/courses");
  return { success: true };
}
