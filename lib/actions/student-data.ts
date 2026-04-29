"use server";

import { db } from "@/lib/db";
import {
  courseStudents, courses, classrooms, learningCards,
  cardQuestions, studentAnswers, lessonPlanSections,
} from "@/lib/db/schema";
import { eq, and, asc, inArray, count } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { getRatingSettingsByTeacherId } from "@/lib/actions/templates";

export async function getStudentCourses() {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return [];

  return db
    .select({
      courseId: courses.id,
      courseName: courses.name,
      year: courses.year,
      semester: courses.semester,
    })
    .from(courseStudents)
    .innerJoin(courses, eq(courseStudents.courseId, courses.id))
    .where(eq(courseStudents.studentId, user.id));
}

export async function getStudentCards(limit = 20, offset = 0) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return { cards: [], total: 0 };

  // Get all published cards from courses the student is enrolled in (paginated)
  const result = await db
    .select({
      cardId: learningCards.id,
      cardName: learningCards.name,
      courseName: courses.name,
      courseId: courses.id,
      classroomDate: classrooms.date,
    })
    .from(courseStudents)
    .innerJoin(courses, eq(courseStudents.courseId, courses.id))
    .innerJoin(classrooms, eq(classrooms.courseId, courses.id))
    .innerJoin(learningCards, eq(learningCards.classroomId, classrooms.id))
    .where(
      and(
        eq(courseStudents.studentId, user.id),
        eq(learningCards.status, "published")
      )
    )
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: count() })
    .from(courseStudents)
    .innerJoin(courses, eq(courseStudents.courseId, courses.id))
    .innerJoin(classrooms, eq(classrooms.courseId, courses.id))
    .innerJoin(learningCards, eq(learningCards.classroomId, classrooms.id))
    .where(
      and(
        eq(courseStudents.studentId, user.id),
        eq(learningCards.status, "published")
      )
    );

  // For each card, get question count and answer count
  if (result.length === 0) return { cards: [], total };

  const cardIds = result.map((r) => r.cardId);

  // Get question counts per card
  const questionCounts = await db
    .select({
      cardId: cardQuestions.cardId,
      questionCount: count(cardQuestions.id),
    })
    .from(cardQuestions)
    .where(inArray(cardQuestions.cardId, cardIds))
    .groupBy(cardQuestions.cardId);

  // Get answer counts per card for this student
  const answerCounts = await db
    .select({
      cardId: cardQuestions.cardId,
      answerCount: count(studentAnswers.id),
    })
    .from(studentAnswers)
    .innerJoin(cardQuestions, eq(studentAnswers.questionId, cardQuestions.id))
    .where(
      and(
        eq(studentAnswers.studentId, user.id),
        inArray(cardQuestions.cardId, cardIds)
      )
    )
    .groupBy(cardQuestions.cardId);

  const qCountMap = new Map(questionCounts.map((q) => [q.cardId, q.questionCount]));
  const aCountMap = new Map(answerCounts.map((a) => [a.cardId, a.answerCount]));

  const cards = result.map((r) => {
    const totalQuestions = qCountMap.get(r.cardId) ?? 0;
    const totalAnswers = aCountMap.get(r.cardId) ?? 0;
    return {
      ...r,
      totalQuestions,
      totalAnswers,
      answered: totalQuestions > 0 && totalAnswers >= totalQuestions,
    };
  });

  return { cards, total };
}

export async function getCardForStudent(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return null;

  // Verify card exists, is published, and student is enrolled in the course
  const cardResult = await db
    .select({
      card: learningCards,
      teacherId: courses.teacherId,
    })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .innerJoin(courseStudents, and(
      eq(courseStudents.courseId, courses.id),
      eq(courseStudents.studentId, user.id)
    ))
    .where(
      and(eq(learningCards.id, cardId), eq(learningCards.status, "published"))
    );

  if (cardResult.length === 0) return null;
  const card = cardResult[0].card;
  const teacherId = cardResult[0].teacherId;

  const questions = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.cardId, cardId))
    .orderBy(asc(cardQuestions.order));

  // Get existing answers for this card's questions
  const questionIds = questions.map((q) => q.id);
  let cardAnswers: Array<typeof studentAnswers.$inferSelect> = [];
  if (questionIds.length > 0) {
    cardAnswers = await db
      .select()
      .from(studentAnswers)
      .where(
        and(
          eq(studentAnswers.studentId, user.id),
          inArray(studentAnswers.questionId, questionIds)
        )
      );
  }

  const ratingSettings = await getRatingSettingsByTeacherId(teacherId);

  // Build lesson plan link map for self-assessment questions
  const selfAssessmentWithUrl = questions.filter(
    (q) => q.type === "self_assessment" && q.matchedLessonPlanUrl
  );

  const lessonPlanLinks: Record<
    string,
    { url: string; headingText: string }
  > = {};

  if (selfAssessmentWithUrl.length > 0) {
    const sectionIds = selfAssessmentWithUrl
      .map((q) => q.matchedSectionId)
      .filter((id): id is string => !!id);

    const sectionMap: Record<string, string> = {};
    if (sectionIds.length > 0) {
      const sectionRows = await db
        .select({ id: lessonPlanSections.id, headingText: lessonPlanSections.headingText })
        .from(lessonPlanSections)
        .where(inArray(lessonPlanSections.id, sectionIds));
      for (const s of sectionRows) {
        sectionMap[s.id] = s.headingText;
      }
    }

    for (const q of selfAssessmentWithUrl) {
      lessonPlanLinks[q.id] = {
        url: q.matchedLessonPlanUrl!,
        headingText: q.matchedSectionId
          ? (sectionMap[q.matchedSectionId] ?? "查看教案")
          : "查看教案",
      };
    }
  }

  return {
    card,
    questions,
    existingAnswers: cardAnswers,
    ratingSettings,
    lessonPlanLinks,
  };
}
