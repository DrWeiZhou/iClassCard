"use server";

import { db } from "@/lib/db";
import {
  groupRatings,
  cardQuestions,
  studentAnswers,
  students,
  courseStudents,
  learningCards,
  classrooms,
  courses,
} from "@/lib/db/schema";
import { eq, and, or, like, avg } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function searchCourseStudents(
  cardId: string,
  keyword: string
) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return [];
  if (!keyword.trim()) return [];

  // Find course via card → classroom → course
  const cardResult = await db
    .select({ courseId: courses.id })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(eq(learningCards.id, cardId));

  if (cardResult.length === 0) return [];
  const courseId = cardResult[0].courseId;

  const searchPattern = `%${keyword.trim()}%`;
  const results = await db
    .select({
      id: students.id,
      studentNo: students.studentNo,
      name: students.name,
    })
    .from(courseStudents)
    .innerJoin(students, eq(courseStudents.studentId, students.id))
    .where(
      and(
        eq(courseStudents.courseId, courseId),
        or(
          like(students.studentNo, searchPattern),
          like(students.name, searchPattern)
        )
      )
    )
    .limit(10);

  // Exclude self
  return results.filter((r) => r.id !== user.id);
}

export async function submitGroupRating(
  questionId: string,
  targetStudentId: string,
  stars: number,
  deviceType: string
) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return { error: "未授权" };

  // Validate stars
  if (stars < 1 || stars > 5) return { error: "评分无效" };

  // Validate question
  const [question] = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.id, questionId));
  if (!question || question.type !== "group_discussion")
    return { error: "题目不存在" };

  // Check if question is closed (收题)
  if (question.closedAt) return { error: "该题目已收题，无法作答" };

  // Prevent self-rating
  if (user.id === targetStudentId)
    return { error: "不能给自己打分" };

  // Validate target student is in same course
  const courseCheck = await db
    .select({ courseId: courses.id })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(eq(learningCards.id, question.cardId));

  if (courseCheck.length === 0) return { error: "课程不存在" };
  const courseId = courseCheck[0].courseId;

  const [targetEnrolled] = await db
    .select()
    .from(courseStudents)
    .where(
      and(
        eq(courseStudents.courseId, courseId),
        eq(courseStudents.studentId, targetStudentId)
      )
    );
  if (!targetEnrolled) return { error: "该学生不在本课程中" };

  // Check for existing rating (upsert behavior)
  const [existing] = await db
    .select()
    .from(groupRatings)
    .where(
      and(
        eq(groupRatings.questionId, questionId),
        eq(groupRatings.raterId, user.id),
        eq(groupRatings.targetStudentId, targetStudentId)
      )
    );

  if (existing) {
    // Already rated, return silently
    return { success: true, score: existing.stars };
  }

  // Insert rating
  await db.insert(groupRatings).values({
    questionId,
    raterId: user.id,
    targetStudentId,
    stars,
  });

  // Ensure rater has a studentAnswers record
  const [raterAnswer] = await db
    .select()
    .from(studentAnswers)
    .where(
      and(
        eq(studentAnswers.questionId, questionId),
        eq(studentAnswers.studentId, user.id)
      )
    );
  if (!raterAnswer) {
    await db.insert(studentAnswers).values({
      questionId,
      studentId: user.id,
      answer: {},
      score: null,
      deviceType,
    });
  }

  // Recalculate target student's score
  const avgResult = await db
    .select({ avgStars: avg(groupRatings.stars) })
    .from(groupRatings)
    .where(
      and(
        eq(groupRatings.questionId, questionId),
        eq(groupRatings.targetStudentId, targetStudentId)
      )
    );

  const avgStars = avgResult[0]?.avgStars
    ? parseFloat(avgResult[0].avgStars)
    : 0;
  const newScore = Math.round(avgStars * (question.score / 5));

  // Upsert target student's answer record with new score
  const [targetAnswer] = await db
    .select()
    .from(studentAnswers)
    .where(
      and(
        eq(studentAnswers.questionId, questionId),
        eq(studentAnswers.studentId, targetStudentId)
      )
    );

  if (targetAnswer) {
    await db
      .update(studentAnswers)
      .set({ score: newScore })
      .where(eq(studentAnswers.id, targetAnswer.id));
  } else {
    await db.insert(studentAnswers).values({
      questionId,
      studentId: targetStudentId,
      answer: {},
      score: newScore,
      deviceType,
    });
  }

  return { success: true, score: newScore };
}

export async function getGroupRatings(questionId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return [];

  const ratings = await db
    .select({
      targetStudentId: groupRatings.targetStudentId,
      targetStudentName: students.name,
      targetStudentNo: students.studentNo,
      stars: groupRatings.stars,
    })
    .from(groupRatings)
    .innerJoin(students, eq(groupRatings.targetStudentId, students.id))
    .where(
      and(
        eq(groupRatings.questionId, questionId),
        eq(groupRatings.raterId, user.id)
      )
    );

  return ratings;
}
