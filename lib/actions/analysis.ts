"use server";

import { db } from "@/lib/db";
import {
  cardQuestions,
  studentAnswers,
  learningCards,
  classrooms,
  courses,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

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
