import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

export const teachers = pgTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  college: varchar("college", { length: 100 }).notNull(),
  major: varchar("major", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const llmModels = pgTable("llm_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  modelName: varchar("model_name", { length: 100 }).notNull(),
  baseUrl: varchar("base_url", { length: 500 }).notNull(),
  apiKey: varchar("api_key", { length: 500 }).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  year: varchar("year", { length: 20 }).notNull(),
  semester: varchar("semester", { length: 20 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  studentCount: integer("student_count").default(0).notNull(),
  classComposition: text("class_composition"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentNo: varchar("student_no", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 50 }).notNull(),
  gender: varchar("gender", { length: 10 }),
  college: varchar("college", { length: 100 }),
  grade: varchar("grade", { length: 20 }),
  major: varchar("major", { length: 100 }),
  class: varchar("class", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 100 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courseStudents = pgTable(
  "course_students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    isRetake: boolean("is_retake").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.courseId, t.studentId)]
);

export const classrooms = pgTable("classrooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  time: varchar("time", { length: 50 }).notNull(),
  name: varchar("name", { length: 200 }),
  room: varchar("room", { length: 100 }),
  instructor: varchar("instructor", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const learningCards = pgTable("learning_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  totalScore: integer("total_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cardQuestions = pgTable("card_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => learningCards.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  order: integer("order").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  options: jsonb("options"),
  correctAnswer: text("correct_answer"),
  score: integer("score").default(0).notNull(),
  gradingPrompt: text("grading_prompt"),
  feedbackPrompt: text("feedback_prompt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentAnswers = pgTable(
  "student_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => cardQuestions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    answer: jsonb("answer"),
    score: integer("score"),
    aiFeedback: text("ai_feedback"),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    deviceType: varchar("device_type", { length: 20 }),
  },
  (t) => [unique().on(t.questionId, t.studentId)]
);

export const promptTemplates = pgTable(
  "prompt_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    questionType: varchar("question_type", { length: 30 }).notNull(),
    templateKind: varchar("template_kind", { length: 20 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.teacherId, t.questionType, t.templateKind)]
);

export const groupRatings = pgTable(
  "group_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => cardQuestions.id, { onDelete: "cascade" }),
    raterId: uuid("rater_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    targetStudentId: uuid("target_student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.questionId, t.raterId, t.targetStudentId)]
);
