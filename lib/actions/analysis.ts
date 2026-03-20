"use server";

import { db } from "@/lib/db";
import {
  cardQuestions,
  studentAnswers,
  learningCards,
  classrooms,
  courses,
  groupRatings,
  students,
} from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { courseStudents } from "@/lib/db/schema";

export type AnalysisQuestion = {
  id: string;
  cardId: string;
  type: string;
  order: number;
  title: string;
  content: string | null;
  options: unknown;
  correctAnswer: string | null;
  score: number;
  gradingPrompt: string | null;
  feedbackPrompt: string | null;
  closedAt: Date | null;
  createdAt: Date;
};

export type AnalysisAnswer = {
  id: string;
  questionId: string;
  studentId: string;
  answer: unknown;
  score: number | null;
  aiFeedback: string | null;
  submittedAt: Date;
  deviceType: string | null;
};

export type AnalysisData = {
  question: AnalysisQuestion;
  answers: AnalysisAnswer[];
};

export async function getCardAnalysis(
  cardId: string
): Promise<AnalysisData[]> {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return [];

  // Verify ownership through card → classroom → course → teacher
  const ownerCheck = await db
    .select({ teacherId: courses.teacherId })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(learningCards.id, cardId), eq(courses.teacherId, user.id)));

  if (ownerCheck.length === 0) return [];

  const questions = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.cardId, cardId))
    .orderBy(asc(cardQuestions.order));

  const analysisData = await Promise.all(
    questions.map(async (q) => {
      const answers = await db
        .select()
        .from(studentAnswers)
        .where(eq(studentAnswers.questionId, q.id));

      return { question: q, answers } as AnalysisData;
    })
  );

  return analysisData;
}

export async function getCardInfo(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;

  const result = await db
    .select({ card: learningCards })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(learningCards.id, cardId), eq(courses.teacherId, user.id)));

  if (result.length === 0) return null;
  return result[0].card;
}

export async function getQuestionAnalysis(questionId: string): Promise<AnalysisData | null> {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;

  // Get question and verify ownership
  const [question] = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.id, questionId));
  if (!question) return null;

  // Verify ownership through card → classroom → course → teacher
  const ownerCheck = await db
    .select({ teacherId: courses.teacherId })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(learningCards.id, question.cardId), eq(courses.teacherId, user.id)));

  if (ownerCheck.length === 0) return null;

  const answers = await db
    .select()
    .from(studentAnswers)
    .where(eq(studentAnswers.questionId, questionId));

  return { question, answers };
}

export async function closeQuestion(questionId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  // Get question and verify ownership
  const [question] = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.id, questionId));
  if (!question) return { error: "题目不存在" };

  // Verify ownership through card → classroom → course → teacher
  const ownerCheck = await db
    .select({ teacherId: courses.teacherId })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(learningCards.id, question.cardId), eq(courses.teacherId, user.id)));

  if (ownerCheck.length === 0) return { error: "未授权" };

  if (question.closedAt) return { error: "该题目已收题" };

  await db
    .update(cardQuestions)
    .set({ closedAt: new Date() })
    .where(eq(cardQuestions.id, questionId));

  return { success: true };
}

export type GroupRatingDetail = {
  targetStudentId: string;
  targetStudentName: string;
  targetStudentNo: string;
  raterId: string;
  raterName: string;
  raterStudentNo: string;
  stars: number;
};

export async function getGroupDiscussionAnalysis(questionId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;

  // Verify ownership
  const [question] = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.id, questionId));
  if (!question) return null;

  const ownerCheck = await db
    .select({ teacherId: courses.teacherId })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(
      and(eq(learningCards.id, question.cardId), eq(courses.teacherId, user.id))
    );
  if (ownerCheck.length === 0) return null;

  // Get all ratings with student names
  // We need to alias the students table for rater and target
  const ratings = await db
    .select({
      targetStudentId: groupRatings.targetStudentId,
      raterId: groupRatings.raterId,
      stars: groupRatings.stars,
    })
    .from(groupRatings)
    .where(eq(groupRatings.questionId, questionId));

  // Collect all student IDs
  const studentIds = new Set<string>();
  for (const r of ratings) {
    studentIds.add(r.targetStudentId);
    studentIds.add(r.raterId);
  }

  // Fetch student info
  const studentList =
    studentIds.size > 0
      ? await db
          .select({ id: students.id, name: students.name, studentNo: students.studentNo })
          .from(students)
          .where(inArray(students.id, Array.from(studentIds)))
      : [];
  const studentMap = new Map(studentList.map((s) => [s.id, s]));

  const details: GroupRatingDetail[] = ratings.map((r) => ({
    targetStudentId: r.targetStudentId,
    targetStudentName: studentMap.get(r.targetStudentId)?.name ?? "未知",
    targetStudentNo: studentMap.get(r.targetStudentId)?.studentNo ?? "",
    raterId: r.raterId,
    raterName: studentMap.get(r.raterId)?.name ?? "未知",
    raterStudentNo: studentMap.get(r.raterId)?.studentNo ?? "",
    stars: r.stars,
  }));

  return { question, details };
}

export async function getCardStudents(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;

  // Verify ownership and get courseId
  const cardResult = await db
    .select({ courseId: courses.id, cardName: learningCards.name })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(learningCards.id, cardId), eq(courses.teacherId, user.id)));

  if (cardResult.length === 0) return null;

  const { courseId, cardName } = cardResult[0];

  // Get all enrolled students
  const studentList = await db
    .select({
      id: students.id,
      studentNo: students.studentNo,
      name: students.name,
    })
    .from(courseStudents)
    .innerJoin(students, eq(courseStudents.studentId, students.id))
    .where(eq(courseStudents.courseId, courseId));

  // Get answer counts per student for this card
  const questions = await db
    .select({ id: cardQuestions.id })
    .from(cardQuestions)
    .where(eq(cardQuestions.cardId, cardId));

  const questionIds = questions.map((q) => q.id);
  let answersByStudent = new Map<string, number>();

  if (questionIds.length > 0) {
    const answers = await db
      .select({
        studentId: studentAnswers.studentId,
      })
      .from(studentAnswers)
      .where(inArray(studentAnswers.questionId, questionIds));

    for (const a of answers) {
      answersByStudent.set(a.studentId, (answersByStudent.get(a.studentId) ?? 0) + 1);
    }
  }

  const totalQuestions = questions.length;

  return {
    cardName,
    students: studentList.map((s) => ({
      ...s,
      answeredCount: answersByStudent.get(s.id) ?? 0,
      totalQuestions,
    })),
  };
}

export async function getStudentCardForTeacher(cardId: string, studentId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;

  // Verify ownership
  const cardResult = await db
    .select({ card: learningCards })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(learningCards.id, cardId), eq(courses.teacherId, user.id)));

  if (cardResult.length === 0) return null;
  const card = cardResult[0].card;

  // Get student info
  const [student] = await db
    .select({ name: students.name, studentNo: students.studentNo })
    .from(students)
    .where(eq(students.id, studentId));

  if (!student) return null;

  const questions = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.cardId, cardId))
    .orderBy(asc(cardQuestions.order));

  const questionIds = questions.map((q) => q.id);
  let cardAnswers: Array<typeof studentAnswers.$inferSelect> = [];
  if (questionIds.length > 0) {
    cardAnswers = await db
      .select()
      .from(studentAnswers)
      .where(
        and(
          eq(studentAnswers.studentId, studentId),
          inArray(studentAnswers.questionId, questionIds)
        )
      );
  }

  return {
    card,
    questions,
    existingAnswers: cardAnswers,
    studentName: student.name,
    studentNo: student.studentNo,
  };
}
