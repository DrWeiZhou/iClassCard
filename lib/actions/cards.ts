"use server";

import { db } from "@/lib/db";
import {
  learningCards,
  cardQuestions,
  classrooms,
  courses,
  lessonPlanSections,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Helper: verify the teacher owns the classroom through course
async function verifyCardAccess(classroomId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const result = await db
    .select({ courseId: courses.id, teacherId: courses.teacherId })
    .from(classrooms)
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(classrooms.id, classroomId), eq(courses.teacherId, user.id)));
  return result.length > 0 ? { user, courseId: result[0].courseId } : null;
}

// Helper: verify the teacher owns the card through classroom→course
async function verifyCardOwnership(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const result = await db
    .select({
      card: learningCards,
      courseId: courses.id,
      classroomId: classrooms.id,
    })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(learningCards.id, cardId), eq(courses.teacherId, user.id)));
  if (result.length === 0) return null;
  return {
    user,
    card: result[0].card,
    courseId: result[0].courseId,
    classroomId: result[0].classroomId,
  };
}

// Get all cards for a classroom
export async function getCards(classroomId: string) {
  const access = await verifyCardAccess(classroomId);
  if (!access) return [];

  return db
    .select()
    .from(learningCards)
    .where(eq(learningCards.classroomId, classroomId))
    .orderBy(asc(learningCards.createdAt));
}

// Create a new card
export async function createCard(classroomId: string, name: string) {
  const access = await verifyCardAccess(classroomId);
  if (!access) return { error: "未授权" };

  if (!name.trim()) {
    return { error: "请输入学习卡名称" };
  }

  await db.insert(learningCards).values({
    classroomId,
    name: name.trim(),
  });

  revalidatePath(
    `/teacher/courses/${access.courseId}/classrooms/${classroomId}/cards`
  );
  return { success: true };
}

// Get card with its questions (verify teacher ownership via card→classroom→course→teacher)
export async function getCardWithQuestions(cardId: string) {
  const ownership = await verifyCardOwnership(cardId);
  if (!ownership) return null;

  const card = ownership.card;
  const questions = await db
    .select({
      id: cardQuestions.id,
      cardId: cardQuestions.cardId,
      type: cardQuestions.type,
      order: cardQuestions.order,
      title: cardQuestions.title,
      content: cardQuestions.content,
      options: cardQuestions.options,
      correctAnswer: cardQuestions.correctAnswer,
      score: cardQuestions.score,
      gradingPrompt: cardQuestions.gradingPrompt,
      feedbackPrompt: cardQuestions.feedbackPrompt,
      matchedSectionId: cardQuestions.matchedSectionId,
      matchedHeadingText: lessonPlanSections.headingText,
      matchedAnchorId: lessonPlanSections.anchorId,
      matchedLessonPlanId: lessonPlanSections.lessonPlanId,
    })
    .from(cardQuestions)
    .leftJoin(lessonPlanSections, eq(cardQuestions.matchedSectionId, lessonPlanSections.id))
    .where(eq(cardQuestions.cardId, cardId))
    .orderBy(asc(cardQuestions.order));

  return { ...card, questions };
}

// Publish a card (verify ownership, check totalScore === 100)
export async function publishCard(cardId: string) {
  const ownership = await verifyCardOwnership(cardId);
  if (!ownership) return { error: "未授权" };

  const { card, courseId, classroomId } = ownership;

  if (card.status === "published") {
    return { error: "该学习卡已发放" };
  }

  await db
    .update(learningCards)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(learningCards.id, cardId));

  revalidatePath(
    `/teacher/courses/${courseId}/classrooms/${classroomId}/cards`
  );
  return { success: true };
}

// Delete a card (verify ownership, cascade deletes questions + student answers)
export async function deleteCard(cardId: string) {
  const ownership = await verifyCardOwnership(cardId);
  if (!ownership) return { error: "未授权" };

  const { courseId, classroomId } = ownership;

  await db.delete(learningCards).where(eq(learningCards.id, cardId));

  revalidatePath(
    `/teacher/courses/${courseId}/classrooms/${classroomId}/cards`
  );
  return { success: true };
}

// Save card name and questions (verify ownership, only draft cards)
// Delete-and-reinsert strategy: delete all existing questions, insert new ones
// Update name and totalScore on the card
export async function saveQuestions(
  cardId: string,
  cardName: string,
  questions: Array<{
    id?: string;
    type: string;
    order: number;
    title: string;
    content?: string;
    options?: unknown;
    correctAnswer?: string;
    score: number;
    gradingPrompt?: string;
    feedbackPrompt?: string;
  }>
) {
  const ownership = await verifyCardOwnership(cardId);
  if (!ownership) return { error: "未授权" };

  const { card, courseId, classroomId } = ownership;

  if (card.status === "published") {
    return { error: "已发放的学习卡不能编辑" };
  }

  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

  // Delete all existing questions
  await db.delete(cardQuestions).where(eq(cardQuestions.cardId, cardId));

  // Insert new questions and get their IDs
  let insertedQuestions: Array<{ id: string; type: string; title: string }> = [];
  if (questions.length > 0) {
    insertedQuestions = await db.insert(cardQuestions).values(
      questions.map((q) => ({
        cardId,
        type: q.type,
        order: q.order,
        title: q.title,
        content: q.content || null,
        options: q.options || null,
        correctAnswer: q.correctAnswer || null,
        score: q.score,
        gradingPrompt: q.gradingPrompt || null,
        feedbackPrompt: q.feedbackPrompt || null,
      }))
    ).returning({ id: cardQuestions.id, type: cardQuestions.type, title: cardQuestions.title });
  }

  // Update totalScore on the card
  await db
    .update(learningCards)
    .set({ name: cardName.trim(), totalScore, updatedAt: new Date() })
    .where(eq(learningCards.id, cardId));

  revalidatePath(
    `/teacher/courses/${courseId}/classrooms/${classroomId}/cards`
  );

  // Return self-assessment question info for AI matching
  const selfAssessmentQuestions = insertedQuestions
    .filter((q) => q.type === "self_assessment")
    .map((q) => ({ id: q.id, title: q.title }));

  return { success: true, classroomId, selfAssessmentQuestions };
}
