"use server";

import { db } from "@/lib/db";
import { classrooms, courses } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const classroomSchema = z.object({
  date: z.string().min(1, "请选择日期"),
  time: z.string().min(1, "请输入时间"),
  name: z.string().optional(),
  room: z.string().optional(),
  instructor: z.string().optional(),
  notes: z.string().optional(),
});

async function verifyCourseOwnership(courseId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, user.id)));
  return course ? user : null;
}

export async function getClassrooms(courseId: string) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return [];

  return db
    .select()
    .from(classrooms)
    .where(eq(classrooms.courseId, courseId))
    .orderBy(desc(classrooms.date));
}

export async function createClassroom(
  courseId: string,
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return { error: "未授权" };

  const parsed = classroomSchema.safeParse({
    date: formData.get("date"),
    time: formData.get("time"),
    name: formData.get("name"),
    room: formData.get("room"),
    instructor: formData.get("instructor"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { date, time, name, room, instructor, notes } = parsed.data;

  await db.insert(classrooms).values({
    courseId,
    date,
    time,
    name: name || null,
    room: room || null,
    instructor: instructor || null,
    notes: notes || null,
  });

  revalidatePath(`/teacher/courses/${courseId}/classrooms`);
  revalidatePath(`/teacher/classrooms`);
  return { success: true };
}

export async function updateClassroom(
  courseId: string,
  classroomId: string,
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return { error: "未授权" };

  const parsed = classroomSchema.safeParse({
    date: formData.get("date"),
    time: formData.get("time"),
    name: formData.get("name"),
    room: formData.get("room"),
    instructor: formData.get("instructor"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify classroom belongs to this course
  const [existing] = await db
    .select()
    .from(classrooms)
    .where(
      and(eq(classrooms.id, classroomId), eq(classrooms.courseId, courseId))
    );

  if (!existing) {
    return { error: "课堂不存在" };
  }

  const { date, time, name, room, instructor, notes } = parsed.data;

  await db
    .update(classrooms)
    .set({
      date,
      time,
      name: name || null,
      room: room || null,
      instructor: instructor || null,
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(classrooms.id, classroomId));

  revalidatePath(`/teacher/courses/${courseId}/classrooms`);
  revalidatePath(`/teacher/classrooms`);
  return { success: true };
}

export async function deleteClassroom(courseId: string, classroomId: string) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return { error: "未授权" };

  // Verify classroom belongs to this course
  const [existing] = await db
    .select()
    .from(classrooms)
    .where(
      and(eq(classrooms.id, classroomId), eq(classrooms.courseId, courseId))
    );

  if (!existing) {
    return { error: "课堂不存在" };
  }

  await db.delete(classrooms).where(eq(classrooms.id, classroomId));

  revalidatePath(`/teacher/courses/${courseId}/classrooms`);
  revalidatePath(`/teacher/classrooms`);
  return { success: true };
}

export async function getAllClassrooms() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return [];

  return db
    .select({
      id: classrooms.id,
      courseId: classrooms.courseId,
      courseName: courses.name,
      date: classrooms.date,
      time: classrooms.time,
      name: classrooms.name,
      room: classrooms.room,
      instructor: classrooms.instructor,
      notes: classrooms.notes,
      createdAt: classrooms.createdAt,
    })
    .from(classrooms)
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(eq(courses.teacherId, user.id))
    .orderBy(desc(classrooms.date));
}

export async function getTeacherCourses() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return [];
  return db.select({ id: courses.id, name: courses.name }).from(courses).where(eq(courses.teacherId, user.id));
}
