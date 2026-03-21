"use server";

import { db } from "@/lib/db";
import {
  lessonPlans,
  lessonPlanSections,
  classrooms,
  courses,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

// Verify teacher owns the classroom
export async function verifyClassroomOwnership(classroomId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const result = await db
    .select({ courseId: courses.id, teacherId: courses.teacherId })
    .from(classrooms)
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(classrooms.id, classroomId), eq(courses.teacherId, user.id)));
  return result.length > 0 ? { user, courseId: result[0].courseId } : null;
}

// Get lesson plan for a classroom
export async function getLessonPlan(classroomId: string) {
  const [plan] = await db
    .select()
    .from(lessonPlans)
    .where(eq(lessonPlans.classroomId, classroomId));
  if (!plan) return null;

  const sections = await db
    .select()
    .from(lessonPlanSections)
    .where(eq(lessonPlanSections.lessonPlanId, plan.id))
    .orderBy(lessonPlanSections.sectionOrder);

  return { ...plan, sections };
}

// Get lesson plan by ID (for student viewer)
export async function getLessonPlanById(id: string) {
  const [plan] = await db
    .select()
    .from(lessonPlans)
    .where(eq(lessonPlans.id, id));
  return plan ?? null;
}

// Get sections for a lesson plan
export async function getLessonPlanSections(lessonPlanId: string) {
  return db
    .select()
    .from(lessonPlanSections)
    .where(eq(lessonPlanSections.lessonPlanId, lessonPlanId))
    .orderBy(lessonPlanSections.sectionOrder);
}
