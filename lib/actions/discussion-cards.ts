"use server";

import { db } from "@/lib/db";
import {
  discussionCards,
  discussionSessions,
  classrooms,
  courses,
  students,
  courseStudents,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getRatingSettingsByTeacherId } from "@/lib/actions/templates";

async function verifyClassroomAccess(classroomId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const result = await db
    .select({ courseId: courses.id, teacherId: courses.teacherId })
    .from(classrooms)
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(classrooms.id, classroomId), eq(courses.teacherId, user.id)));
  return result.length > 0 ? { user, courseId: result[0].courseId } : null;
}

async function verifyDiscussionCardOwnership(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const result = await db
    .select({
      card: discussionCards,
      courseId: courses.id,
      classroomId: classrooms.id,
    })
    .from(discussionCards)
    .innerJoin(classrooms, eq(discussionCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(discussionCards.id, cardId), eq(courses.teacherId, user.id)));
  if (result.length === 0) return null;
  return {
    user,
    card: result[0].card,
    courseId: result[0].courseId,
    classroomId: result[0].classroomId,
  };
}

export async function getDiscussionCards(classroomId: string) {
  const access = await verifyClassroomAccess(classroomId);
  if (!access) return [];

  return db
    .select()
    .from(discussionCards)
    .where(eq(discussionCards.classroomId, classroomId))
    .orderBy(asc(discussionCards.createdAt));
}

export async function createDiscussionCard(
  classroomId: string,
  data: {
    topic: string;
    participationMaxScore: number;
    attitudeMaxScore: number;
    abilityMaxScore: number;
    emotionMaxScore: number;
    innovationMaxScore: number;
    minRounds: number;
  }
) {
  const access = await verifyClassroomAccess(classroomId);
  if (!access) return { error: "未授权" };

  if (!data.topic.trim()) return { error: "请输入讨论交流主题" };

  await db.insert(discussionCards).values({
    classroomId,
    topic: data.topic.trim(),
    participationMaxScore: data.participationMaxScore,
    attitudeMaxScore: data.attitudeMaxScore,
    abilityMaxScore: data.abilityMaxScore,
    emotionMaxScore: data.emotionMaxScore,
    innovationMaxScore: data.innovationMaxScore,
    minRounds: data.minRounds,
  });

  revalidatePath(
    `/teacher/courses/${access.courseId}/classrooms/${classroomId}/discussions`
  );
  return { success: true };
}

export async function updateDiscussionCard(
  cardId: string,
  data: {
    topic: string;
    participationMaxScore: number;
    attitudeMaxScore: number;
    abilityMaxScore: number;
    emotionMaxScore: number;
    innovationMaxScore: number;
    minRounds: number;
  }
) {
  const ownership = await verifyDiscussionCardOwnership(cardId);
  if (!ownership) return { error: "未授权" };

  if (ownership.card.status === "published") {
    return { error: "已发放的交流卡不能编辑" };
  }

  if (!data.topic.trim()) return { error: "请输入讨论交流主题" };

  await db
    .update(discussionCards)
    .set({
      topic: data.topic.trim(),
      participationMaxScore: data.participationMaxScore,
      attitudeMaxScore: data.attitudeMaxScore,
      abilityMaxScore: data.abilityMaxScore,
      emotionMaxScore: data.emotionMaxScore,
      innovationMaxScore: data.innovationMaxScore,
      minRounds: data.minRounds,
      updatedAt: new Date(),
    })
    .where(eq(discussionCards.id, cardId));

  revalidatePath(
    `/teacher/courses/${ownership.courseId}/classrooms/${ownership.classroomId}/discussions`
  );
  return { success: true };
}

export async function deleteDiscussionCard(cardId: string) {
  const ownership = await verifyDiscussionCardOwnership(cardId);
  if (!ownership) return { error: "未授权" };

  if (ownership.card.status === "published") {
    return { error: "已发放的交流卡不能删除" };
  }

  await db.delete(discussionCards).where(eq(discussionCards.id, cardId));

  revalidatePath(
    `/teacher/courses/${ownership.courseId}/classrooms/${ownership.classroomId}/discussions`
  );
  return { success: true };
}

export async function publishDiscussionCard(cardId: string) {
  const ownership = await verifyDiscussionCardOwnership(cardId);
  if (!ownership) return { error: "未授权" };

  if (ownership.card.status === "published") {
    return { error: "该交流卡已发放" };
  }

  await db
    .update(discussionCards)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(discussionCards.id, cardId));

  revalidatePath(
    `/teacher/courses/${ownership.courseId}/classrooms/${ownership.classroomId}/discussions`
  );
  return { success: true };
}

export async function getDiscussionCardDetail(cardId: string) {
  const ownership = await verifyDiscussionCardOwnership(cardId);
  if (!ownership) return null;

  const sessions = await db
    .select({
      session: discussionSessions,
      studentName: students.name,
      studentNo: students.studentNo,
    })
    .from(discussionSessions)
    .innerJoin(students, eq(discussionSessions.studentId, students.id))
    .where(eq(discussionSessions.cardId, cardId))
    .orderBy(asc(discussionSessions.createdAt));

  return {
    card: ownership.card,
    courseId: ownership.courseId,
    classroomId: ownership.classroomId,
    sessions,
  };
}

export async function updateSessionScores(
  sessionId: string,
  scores: {
    participationScore: number;
    attitudeScore: number;
    abilityScore: number;
    emotionScore: number;
    innovationScore: number;
    totalScore: number;
  }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  // Verify teacher owns this session's card
  const [session] = await db
    .select({ cardId: discussionSessions.cardId })
    .from(discussionSessions)
    .where(eq(discussionSessions.id, sessionId));
  if (!session) return { error: "会话不存在" };

  const ownership = await verifyDiscussionCardOwnership(session.cardId);
  if (!ownership) return { error: "未授权" };

  await db
    .update(discussionSessions)
    .set({ ...scores, updatedAt: new Date() })
    .where(eq(discussionSessions.id, sessionId));

  revalidatePath(
    `/teacher/courses/${ownership.courseId}/classrooms/${ownership.classroomId}/discussions/${session.cardId}`
  );
  return { success: true };
}

// Student-side actions

export async function getDiscussionCardForStudent(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return null;

  const cardResult = await db
    .select({ card: discussionCards, teacherId: courses.teacherId })
    .from(discussionCards)
    .innerJoin(classrooms, eq(discussionCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .innerJoin(
      courseStudents,
      and(
        eq(courseStudents.courseId, courses.id),
        eq(courseStudents.studentId, user.id)
      )
    )
    .where(
      and(
        eq(discussionCards.id, cardId),
        eq(discussionCards.status, "published")
      )
    );

  if (cardResult.length === 0) return null;

  const [session] = await db
    .select()
    .from(discussionSessions)
    .where(
      and(
        eq(discussionSessions.cardId, cardId),
        eq(discussionSessions.studentId, user.id)
      )
    );

  const ratingSettings = await getRatingSettingsByTeacherId(cardResult[0].teacherId);

  return {
    card: cardResult[0].card,
    session: session ?? null,
    ratingSettings: {
      high: ratingSettings.discussionHigh,
      mid: ratingSettings.discussionMid,
      low: ratingSettings.discussionLow,
    },
  };
}

export async function getOrCreateSession(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return { error: "未授权" };

  const [existing] = await db
    .select()
    .from(discussionSessions)
    .where(
      and(
        eq(discussionSessions.cardId, cardId),
        eq(discussionSessions.studentId, user.id)
      )
    );

  if (existing) return { session: existing };

  const [created] = await db
    .insert(discussionSessions)
    .values({ cardId, studentId: user.id })
    .returning();

  return { session: created };
}

export async function saveSessionMessages(
  sessionId: string,
  messages: Array<{ role: string; content: string }>
) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return { error: "未授权" };

  await db
    .update(discussionSessions)
    .set({ messages, updatedAt: new Date() })
    .where(
      and(
        eq(discussionSessions.id, sessionId),
        eq(discussionSessions.studentId, user.id)
      )
    );

  return { success: true };
}

export async function completeSession(
  sessionId: string,
  scores: {
    participationScore: number;
    attitudeScore: number;
    abilityScore: number;
    emotionScore: number;
    innovationScore: number;
    totalScore: number;
    aiSummary: string;
  },
  messages: Array<{ role: string; content: string }>
) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return { error: "未授权" };

  await db
    .update(discussionSessions)
    .set({
      status: "completed",
      messages,
      ...scores,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(discussionSessions.id, sessionId),
        eq(discussionSessions.studentId, user.id)
      )
    );

  return { success: true };
}

// Get student discussion cards (for student course page)
export async function getStudentDiscussionCards() {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return [];

  const result = await db
    .select({
      cardId: discussionCards.id,
      topic: discussionCards.topic,
      courseName: courses.name,
      courseId: courses.id,
      classroomDate: classrooms.date,
    })
    .from(courseStudents)
    .innerJoin(courses, eq(courseStudents.courseId, courses.id))
    .innerJoin(classrooms, eq(classrooms.courseId, courses.id))
    .innerJoin(
      discussionCards,
      eq(discussionCards.classroomId, classrooms.id)
    )
    .where(
      and(
        eq(courseStudents.studentId, user.id),
        eq(discussionCards.status, "published")
      )
    );

  if (result.length === 0) return [];

  // Check session status for each card
  const sessions = await db
    .select({
      cardId: discussionSessions.cardId,
      status: discussionSessions.status,
      totalScore: discussionSessions.totalScore,
    })
    .from(discussionSessions)
    .where(eq(discussionSessions.studentId, user.id));

  const sessionMap = new Map(sessions.map((s) => [s.cardId, s]));

  return result.map((r) => {
    const session = sessionMap.get(r.cardId);
    return {
      ...r,
      sessionStatus: session?.status ?? null,
      totalScore: session?.totalScore ?? null,
    };
  });
}
