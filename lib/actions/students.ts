"use server";

import { db } from "@/lib/db";
import {
  students,
  courseStudents,
  courses,
  classrooms,
  learningCards,
  cardQuestions,
  studentAnswers,
  discussionCards,
  discussionSessions,
  groupRatings,
} from "@/lib/db/schema";
import { eq, and, inArray, or } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

async function verifyCourseOwnership(courseId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, user.id)));
  return course ? user : null;
}

export async function getCourseStudents(courseId: string) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return [];

  const rows = await db
    .select({
      id: students.id,
      studentNo: students.studentNo,
      name: students.name,
      gender: students.gender,
      college: students.college,
      grade: students.grade,
      major: students.major,
      class: students.class,
      phone: students.phone,
      email: students.email,
      isRetake: courseStudents.isRetake,
    })
    .from(courseStudents)
    .innerJoin(students, eq(courseStudents.studentId, students.id))
    .where(eq(courseStudents.courseId, courseId));

  return rows;
}

export async function importStudents(
  courseId: string,
  data: Array<{
    studentNo: string;
    name: string;
    gender?: string;
    college?: string;
    grade?: string;
    major?: string;
    class?: string;
    phone?: string;
    email?: string;
    isRetake?: boolean;
  }>
) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return { error: "未授权" };

  let importedCount = 0;

  for (const item of data) {
    if (!item.studentNo || !item.name) continue;

    // Check if student exists by studentNo
    const [existing] = await db
      .select()
      .from(students)
      .where(eq(students.studentNo, item.studentNo));

    let studentId: string;

    if (existing) {
      studentId = existing.id;
    } else {
      // Insert new student
      const [newStudent] = await db
        .insert(students)
        .values({
          studentNo: item.studentNo,
          name: item.name,
          gender: item.gender || null,
          college: item.college || null,
          grade: item.grade || null,
          major: item.major || null,
          class: item.class || null,
          phone: item.phone || null,
          email: item.email || null,
          passwordHash: await bcrypt.hash(item.studentNo, 10),
        })
        .returning();
      studentId = newStudent.id;
    }

    // Insert into courseStudents (ignore if already exists)
    await db
      .insert(courseStudents)
      .values({
        courseId,
        studentId,
        isRetake: item.isRetake ?? false,
      })
      .onConflictDoNothing();

    importedCount++;
  }

  revalidatePath(`/teacher/courses/${courseId}/students`);
  return { success: true, count: importedCount };
}

export async function addStudent(
  courseId: string,
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return { error: "未授权" };

  const studentNo = formData.get("studentNo") as string;
  const name = formData.get("name") as string;

  if (!studentNo || !name) {
    return { error: "学号和姓名为必填项" };
  }

  const gender = (formData.get("gender") as string) || null;
  const college = (formData.get("college") as string) || null;
  const grade = (formData.get("grade") as string) || null;
  const major = (formData.get("major") as string) || null;
  const studentClass = (formData.get("class") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const isRetake = formData.get("isRetake") === "on";

  // Check if student exists by studentNo
  const [existing] = await db
    .select()
    .from(students)
    .where(eq(students.studentNo, studentNo));

  let studentId: string;

  if (existing) {
    studentId = existing.id;
  } else {
    const [newStudent] = await db
      .insert(students)
      .values({
        studentNo,
        name,
        gender,
        college,
        grade,
        major,
        class: studentClass,
        phone,
        email,
        passwordHash: await bcrypt.hash(studentNo, 10),
      })
      .returning();
    studentId = newStudent.id;
  }

  // Check if already enrolled
  const [existingEnrollment] = await db
    .select()
    .from(courseStudents)
    .where(
      and(
        eq(courseStudents.courseId, courseId),
        eq(courseStudents.studentId, studentId)
      )
    );

  if (existingEnrollment) {
    return { error: "该学生已在本课程中" };
  }

  await db.insert(courseStudents).values({
    courseId,
    studentId,
    isRetake,
  });

  revalidatePath(`/teacher/courses/${courseId}/students`);
  return { success: true };
}

export async function removeStudentFromCourse(
  courseId: string,
  studentId: string
) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return { error: "未授权" };

  // 1. 查出该课程所有课堂 ID
  const courseClassrooms = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(eq(classrooms.courseId, courseId));

  if (courseClassrooms.length > 0) {
    const classroomIds = courseClassrooms.map((c) => c.id);

    // 2. 查出所有学习卡题目 ID
    const questions = await db
      .select({ id: cardQuestions.id })
      .from(cardQuestions)
      .innerJoin(learningCards, eq(cardQuestions.cardId, learningCards.id))
      .where(inArray(learningCards.classroomId, classroomIds));

    // 3. 查出所有交流卡 ID
    const discCards = await db
      .select({ id: discussionCards.id })
      .from(discussionCards)
      .where(inArray(discussionCards.classroomId, classroomIds));

    // 4. 删除学习卡回答记录
    if (questions.length > 0) {
      const questionIds = questions.map((q) => q.id);
      await db
        .delete(studentAnswers)
        .where(
          and(
            eq(studentAnswers.studentId, studentId),
            inArray(studentAnswers.questionId, questionIds)
          )
        );

      // 5. 删除同伴评价记录（作为评价者或被评价者）
      await db
        .delete(groupRatings)
        .where(
          and(
            inArray(groupRatings.questionId, questionIds),
            or(
              eq(groupRatings.raterId, studentId),
              eq(groupRatings.targetStudentId, studentId)
            )
          )
        );
    }

    // 6. 删除交流卡会话记录
    if (discCards.length > 0) {
      const discCardIds = discCards.map((d) => d.id);
      await db
        .delete(discussionSessions)
        .where(
          and(
            eq(discussionSessions.studentId, studentId),
            inArray(discussionSessions.cardId, discCardIds)
          )
        );
    }
  }

  // 7. 解除课程关联
  await db
    .delete(courseStudents)
    .where(
      and(
        eq(courseStudents.courseId, courseId),
        eq(courseStudents.studentId, studentId)
      )
    );

  revalidatePath(`/teacher/courses/${courseId}/students`);
  return { success: true };
}
