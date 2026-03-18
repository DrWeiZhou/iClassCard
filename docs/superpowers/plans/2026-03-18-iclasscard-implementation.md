# iClassCard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete AI-powered classroom response card system where teachers create courses, manage students, and publish AI-graded learning cards, while students answer questions and receive streaming AI feedback.

**Architecture:** Single Next.js 15 App Router application with Server Actions for CRUD, API routes for AI streaming (Node.js runtime with Vercel AI SDK), Drizzle ORM on Supabase PostgreSQL, custom JWT auth (jose) with middleware-based role protection.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, Drizzle ORM, Supabase (PostgreSQL), jose (JWT), bcryptjs, Vercel AI SDK, xlsx (SheetJS), recharts, @dnd-kit

**Spec:** `docs/superpowers/specs/2026-03-18-iclasscard-system-design.md`

---

## Phase 1: Foundation

### Task 1: Project Initialization

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Create: `lib/utils.ts`
- Create: `components.json` (Shadcn config)
- Create: `.env.local` (gitignored)
- Create: `.env.example`

- [ ] **Step 1: Initialize Next.js 15 project**

```bash
cd /Users/wei/CodeProjects/iClassCard
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Accept overwriting existing files if prompted. This creates the base Next.js 15 project with App Router.

- [ ] **Step 2: Initialize Shadcn UI**

```bash
npx shadcn@latest init -d
```

This creates `components.json` and sets up the `components/ui/` directory.

- [ ] **Step 3: Install core dependencies**

```bash
npm install drizzle-orm postgres jose bcryptjs zod react-hook-form @hookform/resolvers
npm install -D drizzle-kit @types/bcryptjs
```

- [ ] **Step 4: Install Shadcn UI components needed for Phase 1**

```bash
npx shadcn@latest add button card input label form toast dialog dropdown-menu separator sheet
```

- [ ] **Step 5: Create environment config**

Create `.env.example`:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
DIRECT_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key-at-least-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Create `.env.local` with actual Supabase credentials (gitignored).

- [ ] **Step 6: Set up root layout with Chinese locale**

Update `app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "课堂AI学习卡",
  description: "AI驱动的课堂互动学习卡系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Create landing page with role selection**

Update `app/page.tsx`:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">课堂AI学习卡</h1>
          <p className="text-muted-foreground">AI驱动的课堂互动学习卡系统</p>
        </div>
        <div className="grid gap-4">
          <Link href="/login">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>教师入口</CardTitle>
                <CardDescription>管理课程、学生和学习卡</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/student-login">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>学生入口</CardTitle>
                <CardDescription>查看学习卡、提交答案</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Verify dev server runs**

```bash
npm run dev
```

Open http://localhost:3000 and verify the landing page renders with two role cards.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 15 project with Tailwind, Shadcn UI, and landing page"
```

---

### Task 2: Database Schema (Drizzle ORM)

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create Drizzle config**

Create `drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Create database schema**

Create `lib/db/schema.ts`:
```ts
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
  teacherId: uuid("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  modelName: varchar("model_name", { length: 100 }).notNull(),
  baseUrl: varchar("base_url", { length: 500 }).notNull(),
  apiKey: varchar("api_key", { length: 500 }).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
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
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courseStudents = pgTable(
  "course_students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    isRetake: boolean("is_retake").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.courseId, t.studentId)]
);

export const classrooms = pgTable("classrooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
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
  classroomId: uuid("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  totalScore: integer("total_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cardQuestions = pgTable("card_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardId: uuid("card_id").notNull().references(() => learningCards.id, { onDelete: "cascade" }),
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
    questionId: uuid("question_id").notNull().references(() => cardQuestions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
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
    teacherId: uuid("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
    questionType: varchar("question_type", { length: 30 }).notNull(),
    templateKind: varchar("template_kind", { length: 20 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.teacherId, t.questionType, t.templateKind)]
);
```

- [ ] **Step 3: Create database connection**

Create `lib/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
```

- [ ] **Step 4: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Verify tables are created in Supabase dashboard.

- [ ] **Step 5: Commit**

```bash
git add drizzle.config.ts lib/db/
git commit -m "feat: add Drizzle ORM schema with all tables and run migration"
```

---

### Task 3: Authentication System

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/actions/auth.ts`
- Create: `middleware.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `app/(auth)/student-login/page.tsx`
- Create: `app/(auth)/layout.tsx`

- [ ] **Step 1: Create JWT utilities**

Create `lib/auth.ts`:
```ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "auth-token";

export type AuthPayload = {
  id: string;
  role: "teacher" | "student";
  name: string;
  studentNo?: string;
};

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(payload: AuthPayload) {
  const token = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function getAuthUser(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

- [ ] **Step 2: Create auth Server Actions**

Create `lib/actions/auth.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { teachers, students } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { setAuthCookie, clearAuthCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "请输入姓名"),
  college: z.string().min(1, "请输入学院"),
  major: z.string().min(1, "请输入专业"),
  phone: z.string().min(1, "请输入手机号码"),
  password: z.string().min(6, "密码至少6位"),
});

export async function registerTeacher(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    college: formData.get("college"),
    major: formData.get("major"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, college, major, phone, password } = parsed.data;

  const existing = await db.select().from(teachers).where(eq(teachers.phone, phone));
  if (existing.length > 0) {
    return { error: "该手机号已注册" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [teacher] = await db.insert(teachers).values({
    name,
    college,
    major,
    phone,
    passwordHash,
  }).returning();

  await setAuthCookie({ id: teacher.id, role: "teacher", name: teacher.name });
  redirect("/teacher/courses");
}

export async function loginTeacher(formData: FormData) {
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!phone || !password) {
    return { error: "请输入手机号和密码" };
  }

  const [teacher] = await db.select().from(teachers).where(eq(teachers.phone, phone));
  if (!teacher) {
    return { error: "手机号或密码错误" };
  }

  const valid = await bcrypt.compare(password, teacher.passwordHash);
  if (!valid) {
    return { error: "手机号或密码错误" };
  }

  await setAuthCookie({ id: teacher.id, role: "teacher", name: teacher.name });
  redirect("/teacher/courses");
}

export async function loginStudent(formData: FormData) {
  const studentNo = formData.get("studentNo") as string;
  const name = formData.get("name") as string;

  if (!studentNo || !name) {
    return { error: "请输入学号和姓名" };
  }

  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.studentNo, studentNo), eq(students.name, name)));

  if (!student) {
    return { error: "学号或姓名不匹配" };
  }

  await setAuthCookie({
    id: student.id,
    role: "student",
    studentNo: student.studentNo,
    name: student.name,
  });
  redirect("/student/courses");
}

export async function logout() {
  await clearAuthCookie();
  redirect("/");
}
```

- [ ] **Step 3: Create Next.js middleware for route protection**

Create `middleware.ts` at project root:
```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const path = request.nextUrl.pathname;

  // Public paths
  if (
    path === "/" ||
    path === "/login" ||
    path === "/register" ||
    path === "/student-login"
  ) {
    return NextResponse.next();
  }

  if (!token) {
    if (path.startsWith("/teacher")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (path.startsWith("/student")) {
      return NextResponse.redirect(new URL("/student-login", request.url));
    }
    return NextResponse.next();
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("auth-token");
    return response;
  }

  // Role-based access
  if (path.startsWith("/teacher") && payload.role !== "teacher") {
    return NextResponse.redirect(new URL("/student/courses", request.url));
  }
  if (path.startsWith("/student") && payload.role !== "student") {
    return NextResponse.redirect(new URL("/teacher/courses", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/teacher/:path*", "/student/:path*", "/login", "/register", "/student-login"],
};
```

**Note:** The middleware imports `verifyToken` but cannot use `cookies()` from `next/headers`. The middleware receives the token from `request.cookies`. The `verifyToken` function in `lib/auth.ts` is a pure JWT verify function that doesn't call `cookies()` — it just takes a token string. This works because `jose` is Edge-compatible.

- [ ] **Step 4: Create auth layout**

Create `app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Create teacher login page**

Create `app/(auth)/login/page.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { loginTeacher } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginTeacher, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>教师登录</CardTitle>
        <CardDescription>使用手机号和密码登录</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input id="phone" name="phone" type="tel" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input id="password" name="password" type="password" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "登录中..." : "登录"}
          </Button>
          <p className="text-sm text-muted-foreground">
            还没有账号？ <Link href="/register" className="text-primary underline">注册</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 6: Create teacher registration page**

Create `app/(auth)/register/page.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { registerTeacher } from "@/lib/actions/auth";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerTeacher, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>教师注册</CardTitle>
        <CardDescription>创建教师账号</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="college">学院</Label>
            <Input id="college" name="college" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="major">专业</Label>
            <Input id="major" name="major" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input id="phone" name="phone" type="tel" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "注册中..." : "注册"}
          </Button>
          <p className="text-sm text-muted-foreground">
            已有账号？ <Link href="/login" className="text-primary underline">登录</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 7: Create student login page**

Create `app/(auth)/student-login/page.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { loginStudent } from "@/lib/actions/auth";

export default function StudentLoginPage() {
  const [state, action, pending] = useActionState(loginStudent, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>学生登录</CardTitle>
        <CardDescription>使用学号和姓名登录</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="studentNo">学号</Label>
            <Input id="studentNo" name="studentNo" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input id="name" name="name" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "登录中..." : "登录"}
          </Button>
          <Link href="/" className="text-sm text-muted-foreground text-center underline">
            返回首页
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 8: Verify auth flow works**

```bash
npm run dev
```

Test: register a teacher → should redirect to `/teacher/courses` (404 for now is fine, check cookie exists in browser DevTools). Test login with same credentials. Test invalid credentials shows error.

- [ ] **Step 9: Commit**

```bash
git add middleware.ts lib/auth.ts lib/actions/auth.ts "app/(auth)/"
git commit -m "feat: add JWT auth system with teacher registration, login, and student login"
```

---

### Task 4: Teacher Layout with Sidebar Navigation

**Files:**
- Create: `app/teacher/layout.tsx`
- Create: `components/teacher/sidebar.tsx`
- Create: `components/teacher/header.tsx`

- [ ] **Step 1: Install sidebar-related Shadcn components**

```bash
npx shadcn@latest add avatar scroll-area tooltip
```

- [ ] **Step 2: Create sidebar component**

Create `components/teacher/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  BrainCircuit,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Settings,
  User,
} from "lucide-react";

const navItems = [
  { href: "/teacher/courses", label: "课程管理", icon: BookOpen },
  { href: "/teacher/models", label: "模型管理", icon: BrainCircuit },
  { href: "/teacher/templates", label: "模板维护", icon: FileText },
  { href: "/teacher/profile", label: "个人信息", icon: User },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col border-r bg-muted/40", className)}>
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/teacher/courses" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5" />
          <span>课堂AI学习卡</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 3: Create header component**

Create `components/teacher/header.tsx`:
```tsx
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut } from "lucide-react";
import { Sidebar } from "./sidebar";
import { logout } from "@/lib/actions/auth";

export function Header({ teacherName }: { teacherName: string }) {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>
      <div className="flex-1" />
      <span className="text-sm text-muted-foreground">{teacherName}</span>
      <form action={logout}>
        <Button variant="ghost" size="icon" type="submit">
          <LogOut className="h-4 w-4" />
        </Button>
      </form>
    </header>
  );
}
```

- [ ] **Step 4: Create teacher layout**

Create `app/teacher/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { Sidebar } from "@/components/teacher/sidebar";
import { Header } from "@/components/teacher/header";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden lg:flex w-64" />
      <div className="flex flex-1 flex-col">
        <Header teacherName={user.name} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Install lucide-react icons**

```bash
npm install lucide-react
```

- [ ] **Step 6: Verify layout renders**

Navigate to `/teacher/courses` after logging in. Verify sidebar on desktop, hamburger menu on mobile.

- [ ] **Step 7: Commit**

```bash
git add app/teacher/layout.tsx components/teacher/
git commit -m "feat: add teacher layout with responsive sidebar navigation"
```

---

## Phase 2: Teacher Core Features

### Task 5: Teacher Profile Management

**Files:**
- Create: `lib/actions/teachers.ts`
- Create: `app/teacher/profile/page.tsx`

- [ ] **Step 1: Create teacher Server Actions**

Create `lib/actions/teachers.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { teachers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getTeacherProfile() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const [teacher] = await db.select().from(teachers).where(eq(teachers.id, user.id));
  return teacher ?? null;
}

export async function updateTeacherProfile(formData: FormData) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  const name = formData.get("name") as string;
  const college = formData.get("college") as string;
  const major = formData.get("major") as string;

  if (!name || !college || !major) {
    return { error: "请填写所有必填字段" };
  }

  await db.update(teachers).set({
    name,
    college,
    major,
    updatedAt: new Date(),
  }).where(eq(teachers.id, user.id));

  revalidatePath("/teacher/profile");
  return { success: true };
}
```

- [ ] **Step 2: Create profile page**

Create `app/teacher/profile/page.tsx`:
```tsx
import { getTeacherProfile } from "@/lib/actions/teachers";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const teacher = await getTeacherProfile();
  if (!teacher) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">个人信息</h1>
      <ProfileForm teacher={teacher} />
    </div>
  );
}
```

Create `app/teacher/profile/profile-form.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { updateTeacherProfile } from "@/lib/actions/teachers";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

type Teacher = {
  id: string;
  name: string;
  college: string;
  major: string;
  phone: string;
};

export function ProfileForm({ teacher }: { teacher: Teacher }) {
  const [state, action, pending] = useActionState(updateTeacherProfile, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) {
      toast({ title: "保存成功" });
    }
  }, [state, toast]);

  return (
    <Card>
      <form action={action}>
        <CardContent className="space-y-4 pt-6">
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input id="name" name="name" defaultValue={teacher.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="college">学院</Label>
            <Input id="college" name="college" defaultValue={teacher.college} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="major">专业</Label>
            <Input id="major" name="major" defaultValue={teacher.major} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input id="phone" value={teacher.phone} disabled />
            <p className="text-xs text-muted-foreground">手机号不可修改</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "保存中..." : "保存"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 3: Verify profile page works**

Login as teacher → navigate to profile → edit name → save → verify changes persist.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/teachers.ts app/teacher/profile/
git commit -m "feat: add teacher profile management page"
```

---

### Task 6: LLM Model Management

**Files:**
- Create: `lib/actions/models.ts`
- Create: `app/teacher/models/page.tsx`
- Create: `app/teacher/models/model-form-dialog.tsx`
- Create: `app/teacher/models/model-table.tsx`

- [ ] **Step 1: Install table component**

```bash
npx shadcn@latest add table badge switch alert-dialog
```

- [ ] **Step 2: Create model Server Actions**

Create `lib/actions/models.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { llmModels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getModels() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return [];
  return db.select().from(llmModels).where(eq(llmModels.teacherId, user.id));
}

export async function createModel(formData: FormData) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  const displayName = formData.get("displayName") as string;
  const modelName = formData.get("modelName") as string;
  const baseUrl = formData.get("baseUrl") as string;
  const apiKey = formData.get("apiKey") as string;

  if (!displayName || !modelName || !baseUrl || !apiKey) {
    return { error: "请填写所有字段" };
  }

  // If this is the first model, make it default
  const existing = await db.select().from(llmModels).where(eq(llmModels.teacherId, user.id));
  const isDefault = existing.length === 0;

  await db.insert(llmModels).values({
    teacherId: user.id,
    displayName,
    modelName,
    baseUrl,
    apiKey,
    isDefault,
  });

  revalidatePath("/teacher/models");
  return { success: true };
}

export async function updateModel(id: string, formData: FormData) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  const displayName = formData.get("displayName") as string;
  const modelName = formData.get("modelName") as string;
  const baseUrl = formData.get("baseUrl") as string;
  const apiKey = formData.get("apiKey") as string;

  const updates: Record<string, string> = {};
  if (displayName) updates.displayName = displayName;
  if (modelName) updates.modelName = modelName;
  if (baseUrl) updates.baseUrl = baseUrl;
  if (apiKey) updates.apiKey = apiKey;

  await db.update(llmModels).set(updates).where(
    and(eq(llmModels.id, id), eq(llmModels.teacherId, user.id))
  );

  revalidatePath("/teacher/models");
  return { success: true };
}

export async function deleteModel(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  await db.delete(llmModels).where(
    and(eq(llmModels.id, id), eq(llmModels.teacherId, user.id))
  );

  revalidatePath("/teacher/models");
  return { success: true };
}

export async function setDefaultModel(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  // Unset all defaults
  await db.update(llmModels).set({ isDefault: false }).where(eq(llmModels.teacherId, user.id));
  // Set new default
  await db.update(llmModels).set({ isDefault: true }).where(
    and(eq(llmModels.id, id), eq(llmModels.teacherId, user.id))
  );

  revalidatePath("/teacher/models");
  return { success: true };
}
```

- [ ] **Step 3: Create model table component**

Create `app/teacher/models/model-table.tsx` — a client component that renders a table of models with actions (edit, delete, set default). Each row shows `displayName`, `modelName`, `baseUrl`, masked `apiKey` (****), and `isDefault` badge.

- [ ] **Step 4: Create model form dialog**

Create `app/teacher/models/model-form-dialog.tsx` — a dialog component with form fields for `displayName`, `modelName`, `baseUrl`, `apiKey`. Used for both create and edit (edit pre-fills existing values, apiKey field shows placeholder "留空不修改").

- [ ] **Step 5: Create models page**

Create `app/teacher/models/page.tsx` — server component that fetches models via `getModels()` and renders `ModelTable` with a "新建模型" button that opens `ModelFormDialog`.

- [ ] **Step 6: Verify model CRUD works**

Create a model → verify in list. Edit it → verify update. Set as default → verify badge. Delete → verify removed.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/models.ts app/teacher/models/
git commit -m "feat: add LLM model management with CRUD and default selection"
```

---

### Task 7: Course Management

**Files:**
- Create: `lib/actions/courses.ts`
- Create: `app/teacher/courses/page.tsx`
- Create: `app/teacher/courses/course-form-dialog.tsx`
- Create: `app/teacher/courses/course-list.tsx`
- Create: `app/teacher/courses/[courseId]/page.tsx`
- Create: `app/teacher/courses/[courseId]/layout.tsx`

- [ ] **Step 1: Create course Server Actions**

Create `lib/actions/courses.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getCourses() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return [];
  return db.select().from(courses).where(eq(courses.teacherId, user.id));
}

export async function getCourse(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const [course] = await db.select().from(courses).where(
    and(eq(courses.id, id), eq(courses.teacherId, user.id))
  );
  return course ?? null;
}

export async function createCourse(formData: FormData) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  const year = formData.get("year") as string;
  const semester = formData.get("semester") as string;
  const name = formData.get("name") as string;
  const studentCount = parseInt(formData.get("studentCount") as string) || 0;
  const classComposition = formData.get("classComposition") as string;

  if (!year || !semester || !name) {
    return { error: "请填写必填字段" };
  }

  await db.insert(courses).values({
    teacherId: user.id,
    year,
    semester,
    name,
    studentCount,
    classComposition,
  });

  revalidatePath("/teacher/courses");
  return { success: true };
}

export async function updateCourse(id: string, formData: FormData) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  await db.update(courses).set({
    year: formData.get("year") as string,
    semester: formData.get("semester") as string,
    name: formData.get("name") as string,
    studentCount: parseInt(formData.get("studentCount") as string) || 0,
    classComposition: formData.get("classComposition") as string,
    updatedAt: new Date(),
  }).where(and(eq(courses.id, id), eq(courses.teacherId, user.id)));

  revalidatePath("/teacher/courses");
  return { success: true };
}

export async function deleteCourse(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  await db.delete(courses).where(
    and(eq(courses.id, id), eq(courses.teacherId, user.id))
  );

  revalidatePath("/teacher/courses");
  return { success: true };
}
```

- [ ] **Step 2: Create course list with card layout**

Create `app/teacher/courses/page.tsx` — server component listing courses as cards. Each card shows: name, year+semester, student count. Click navigates to `[courseId]/`. "新建课程" button opens dialog.

Create `app/teacher/courses/course-form-dialog.tsx` — form dialog with fields: year (e.g. "2025-2026"), semester (select: 第一学期/第二学期), name, studentCount, classComposition.

- [ ] **Step 3: Create course detail page with sub-navigation**

Create `app/teacher/courses/[courseId]/layout.tsx` — layout that fetches the course and provides a sub-nav with tabs: "学生管理" → students, "课堂管理" → classrooms.

Create `app/teacher/courses/[courseId]/page.tsx` — redirects to `classrooms` subpage.

- [ ] **Step 4: Verify course CRUD**

Create course → appears in list. Click into it → shows sub-navigation. Edit → updates. Delete → removes.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/courses.ts app/teacher/courses/
git commit -m "feat: add course management with CRUD and course detail layout"
```

---

### Task 8: Student Management with Excel Import

**Files:**
- Create: `lib/actions/students.ts`
- Create: `app/teacher/courses/[courseId]/students/page.tsx`
- Create: `app/teacher/courses/[courseId]/students/student-table.tsx`
- Create: `app/teacher/courses/[courseId]/students/excel-import.tsx`
- Create: `app/teacher/courses/[courseId]/students/student-form-dialog.tsx`

- [ ] **Step 1: Install xlsx**

```bash
npm install xlsx
```

- [ ] **Step 2: Create student Server Actions**

Create `lib/actions/students.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { students, courseStudents, courses } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Verify teacher owns the course
async function verifyCoursOwnership(courseId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const [course] = await db.select().from(courses).where(
    and(eq(courses.id, courseId), eq(courses.teacherId, user.id))
  );
  return course ? user : null;
}

export async function getCourseStudents(courseId: string) {
  const user = await verifyCoursOwnership(courseId);
  if (!user) return [];

  return db
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
  const user = await verifyCoursOwnership(courseId);
  if (!user) return { error: "未授权" };

  for (const row of data) {
    // Check if student exists
    const [existing] = await db
      .select()
      .from(students)
      .where(eq(students.studentNo, row.studentNo));

    let studentId: string;
    if (existing) {
      studentId = existing.id;
    } else {
      const [newStudent] = await db.insert(students).values({
        studentNo: row.studentNo,
        name: row.name,
        gender: row.gender,
        college: row.college,
        grade: row.grade,
        major: row.major,
        class: row.class,
        phone: row.phone,
        email: row.email,
      }).returning();
      studentId = newStudent.id;
    }

    // Link to course (ignore if already linked)
    await db.insert(courseStudents).values({
      courseId,
      studentId,
      isRetake: row.isRetake ?? false,
    }).onConflictDoNothing();
  }

  revalidatePath(`/teacher/courses/${courseId}/students`);
  return { success: true, count: data.length };
}

export async function addStudent(courseId: string, formData: FormData) {
  const user = await verifyCoursOwnership(courseId);
  if (!user) return { error: "未授权" };

  const studentNo = formData.get("studentNo") as string;
  const name = formData.get("name") as string;
  if (!studentNo || !name) return { error: "学号和姓名为必填项" };

  const [existing] = await db.select().from(students).where(eq(students.studentNo, studentNo));

  let studentId: string;
  if (existing) {
    studentId = existing.id;
  } else {
    const [newStudent] = await db.insert(students).values({
      studentNo,
      name,
      gender: formData.get("gender") as string,
      college: formData.get("college") as string,
      grade: formData.get("grade") as string,
      major: formData.get("major") as string,
      class: formData.get("class") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
    }).returning();
    studentId = newStudent.id;
  }

  await db.insert(courseStudents).values({
    courseId,
    studentId,
    isRetake: formData.get("isRetake") === "true",
  }).onConflictDoNothing();

  revalidatePath(`/teacher/courses/${courseId}/students`);
  return { success: true };
}

export async function removeStudentFromCourse(courseId: string, studentId: string) {
  const user = await verifyCoursOwnership(courseId);
  if (!user) return { error: "未授权" };

  await db.delete(courseStudents).where(
    and(eq(courseStudents.courseId, courseId), eq(courseStudents.studentId, studentId))
  );

  revalidatePath(`/teacher/courses/${courseId}/students`);
  return { success: true };
}
```

- [ ] **Step 3: Create Excel import component**

Create `app/teacher/courses/[courseId]/students/excel-import.tsx` — client component:
1. File input accepting `.xlsx`
2. On file select: parse with `read()` from `xlsx` package
3. Map sheet columns to fields (学号→studentNo, 姓名→name, etc.)
4. Show preview table of parsed data
5. "确认导入" button calls `importStudents` Server Action
6. Show result toast with import count

- [ ] **Step 4: Create student table and page**

Create `app/teacher/courses/[courseId]/students/student-table.tsx` — table with columns: 学号, 姓名, 性别, 学院, 年级, 专业, 班级, 手机, 邮箱, 是否重修, 操作(删除).

Create `app/teacher/courses/[courseId]/students/page.tsx` — server component that fetches `getCourseStudents()` and renders Excel import button + student table + "添加学生" dialog.

- [ ] **Step 5: Create student form dialog**

Create `app/teacher/courses/[courseId]/students/student-form-dialog.tsx` — dialog form for individual student creation with all fields.

- [ ] **Step 6: Verify Excel import flow**

Create a test `.xlsx` with student data. Upload → preview → confirm → verify students appear in table and in Supabase.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/students.ts app/teacher/courses/\[courseId\]/students/
git commit -m "feat: add student management with Excel import and CRUD"
```

---

## Phase 3: Classroom & Cards

### Task 9: Classroom Management

**Files:**
- Create: `lib/actions/classrooms.ts`
- Create: `app/teacher/courses/[courseId]/classrooms/page.tsx`
- Create: `app/teacher/courses/[courseId]/classrooms/classroom-form-dialog.tsx`
- Create: `app/teacher/courses/[courseId]/classrooms/classroom-list.tsx`

- [ ] **Step 1: Create classroom Server Actions**

Create `lib/actions/classrooms.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { classrooms, courses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function verifyCourseOwnership(courseId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const [course] = await db.select().from(courses).where(
    and(eq(courses.id, courseId), eq(courses.teacherId, user.id))
  );
  return course ? user : null;
}

export async function getClassrooms(courseId: string) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return [];
  return db.select().from(classrooms).where(eq(classrooms.courseId, courseId));
}

export async function createClassroom(courseId: string, formData: FormData) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return { error: "未授权" };

  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  if (!date || !time) return { error: "日期和时间为必填项" };

  await db.insert(classrooms).values({
    courseId,
    date,
    time,
    name: (formData.get("name") as string) || null,
    room: (formData.get("room") as string) || null,
    instructor: (formData.get("instructor") as string) || user.name,
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath(`/teacher/courses/${courseId}/classrooms`);
  return { success: true };
}

export async function updateClassroom(courseId: string, classroomId: string, formData: FormData) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return { error: "未授权" };

  await db.update(classrooms).set({
    date: formData.get("date") as string,
    time: formData.get("time") as string,
    name: (formData.get("name") as string) || null,
    room: (formData.get("room") as string) || null,
    instructor: (formData.get("instructor") as string) || user.name,
    notes: (formData.get("notes") as string) || null,
    updatedAt: new Date(),
  }).where(and(eq(classrooms.id, classroomId), eq(classrooms.courseId, courseId)));

  revalidatePath(`/teacher/courses/${courseId}/classrooms`);
  return { success: true };
}

export async function deleteClassroom(courseId: string, classroomId: string) {
  const user = await verifyCourseOwnership(courseId);
  if (!user) return { error: "未授权" };

  await db.delete(classrooms).where(
    and(eq(classrooms.id, classroomId), eq(classrooms.courseId, courseId))
  );

  revalidatePath(`/teacher/courses/${courseId}/classrooms`);
  return { success: true };
}
```

- [ ] **Step 2: Create classroom list and form components**

Create classroom page with list of classrooms (date, time, name, room, instructor). Each classroom card has: edit, delete, and "学习卡" button that navigates to `classrooms/[classroomId]/cards/`.

Create classroom form dialog with fields: date (date picker), time (input), name, room, instructor (default: teacher name), notes (textarea).

- [ ] **Step 3: Verify classroom CRUD**

Create, edit, delete classrooms within a course.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/classrooms.ts app/teacher/courses/\[courseId\]/classrooms/
git commit -m "feat: add classroom management with CRUD"
```

---

### Task 10: Learning Card CRUD & List

**Files:**
- Create: `lib/actions/cards.ts`
- Create: `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/page.tsx`
- Create: `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/card-list.tsx`

- [ ] **Step 1: Create card Server Actions**

Create `lib/actions/cards.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import {
  learningCards,
  cardQuestions,
  classrooms,
  courses,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

export async function getCards(classroomId: string) {
  const access = await verifyCardAccess(classroomId);
  if (!access) return [];
  return db.select().from(learningCards).where(eq(learningCards.classroomId, classroomId));
}

export async function createCard(classroomId: string, name: string) {
  const access = await verifyCardAccess(classroomId);
  if (!access) return { error: "未授权" };

  const [card] = await db.insert(learningCards).values({
    classroomId,
    name,
    status: "draft",
    totalScore: 0,
  }).returning();

  return { success: true, cardId: card.id };
}

export async function getCardWithQuestions(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;

  // Verify ownership
  const result = await db
    .select({ card: learningCards, teacherId: courses.teacherId })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(learningCards.id, cardId), eq(courses.teacherId, user.id)));
  if (result.length === 0) return null;

  const card = result[0].card;
  const questions = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.cardId, cardId))
    .orderBy(asc(cardQuestions.order));

  return { ...card, questions };
}

export async function publishCard(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  // Verify ownership: card -> classroom -> course -> teacher
  const result = await db
    .select({ teacherId: courses.teacherId })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(eq(learningCards.id, cardId));
  if (result.length === 0 || result[0].teacherId !== user.id) return { error: "未授权" };

  const [card] = await db.select().from(learningCards).where(eq(learningCards.id, cardId));
  if (!card || card.status === "published") return { error: "无法发放" };
  if (card.totalScore !== 100) return { error: "总分必须为100分才能发放" };

  await db.update(learningCards).set({
    status: "published",
    updatedAt: new Date(),
  }).where(eq(learningCards.id, cardId));

  revalidatePath("/teacher");
  return { success: true };
}

export async function deleteCard(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  // Verify ownership: card -> classroom -> course -> teacher
  const result = await db
    .select({ teacherId: courses.teacherId })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(eq(learningCards.id, cardId));
  if (result.length === 0 || result[0].teacherId !== user.id) return { error: "未授权" };

  const [card] = await db.select().from(learningCards).where(eq(learningCards.id, cardId));
  if (!card || card.status === "published") return { error: "已发放的学习卡不能删除" };

  await db.delete(learningCards).where(eq(learningCards.id, cardId));
  revalidatePath("/teacher");
  return { success: true };
}

export async function saveQuestions(
  cardId: string,
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
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  // Verify ownership
  const ownerCheck = await db
    .select({ teacherId: courses.teacherId })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(eq(learningCards.id, cardId));
  if (ownerCheck.length === 0 || ownerCheck[0].teacherId !== user.id) return { error: "未授权" };

  const [card] = await db.select().from(learningCards).where(eq(learningCards.id, cardId));
  if (!card || card.status === "published") return { error: "已发放的学习卡不能编辑" };

  // Delete existing questions and re-insert
  await db.delete(cardQuestions).where(eq(cardQuestions.cardId, cardId));

  if (questions.length > 0) {
    await db.insert(cardQuestions).values(
      questions.map((q) => ({
        cardId,
        type: q.type,
        order: q.order,
        title: q.title,
        content: q.content ?? null,
        options: q.options ?? null,
        correctAnswer: q.correctAnswer ?? null,
        score: q.score,
        gradingPrompt: q.gradingPrompt ?? null,
        feedbackPrompt: q.feedbackPrompt ?? null,
      }))
    );
  }

  // Update total score
  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
  await db.update(learningCards).set({
    totalScore,
    updatedAt: new Date(),
  }).where(eq(learningCards.id, cardId));

  revalidatePath("/teacher");
  return { success: true };
}
```

- [ ] **Step 2: Create card list page**

Create the cards list page showing all cards for a classroom with: name, status badge (草稿/已发放), total score, action buttons (编辑 for draft, 发放 with confirm dialog, 分析).

- [ ] **Step 3: Verify card creation and listing**

Create cards, verify list. Attempt to publish with wrong total score → see error.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/cards.ts app/teacher/courses/\[courseId\]/classrooms/\[classroomId\]/cards/
git commit -m "feat: add learning card CRUD, list, and publish flow"
```

---

### Task 11: Learning Card Editor

**Files:**
- Create: `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/[cardId]/edit/page.tsx`
- Create: `components/teacher/card-editor/index.tsx`
- Create: `components/teacher/card-editor/question-self-assessment.tsx`
- Create: `components/teacher/card-editor/question-multiple-choice.tsx`
- Create: `components/teacher/card-editor/question-fill-blank.tsx`
- Create: `components/teacher/card-editor/question-short-answer.tsx`
- Create: `components/teacher/card-editor/add-question-button.tsx`

- [ ] **Step 1: Install drag-and-drop library**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Create card editor page**

Create `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/[cardId]/edit/page.tsx` — server component that fetches card with questions via `getCardWithQuestions()`, passes data to client `CardEditor` component.

- [ ] **Step 3: Create CardEditor main component**

Create `components/teacher/card-editor/index.tsx` — client component managing card editor state:
- Card name input at top
- Sortable list of question editor components (via @dnd-kit/sortable)
- Each question wrapped in a collapsible card with drag handle, type badge, delete button
- "添加题目" dropdown at bottom (self_assessment, multiple_choice, fill_blank, short_answer)
- Total score display at bottom with warning if != 100
- "保存" button that calls `saveQuestions()` Server Action

State shape:
```ts
type QuestionState = {
  clientId: string; // for React key during drag
  type: "self_assessment" | "multiple_choice" | "fill_blank" | "short_answer";
  title: string;
  content?: string;
  options?: Array<{ label: string; text: string }>;
  correctAnswer?: string;
  score: number;
  gradingPrompt?: string;
  feedbackPrompt?: string;
};
```

- [ ] **Step 4: Create self-assessment question editor**

Create `components/teacher/card-editor/question-self-assessment.tsx`:
- Input field for "学习内容名称" (title)
- Score is always 0 (displayed but not editable)
- Minimal editor — this type has no options, answers, or prompts

- [ ] **Step 5: Create multiple-choice question editor**

Create `components/teacher/card-editor/question-multiple-choice.tsx`:
- Score input (number)
- Title/stem textarea
- Dynamic options list:
  - Each option: label (A/B/C/D auto-generated), text input, checkbox for "correct answer"
  - "添加选项" button
  - Delete option button per row
- Feedback prompt textarea (pre-filled from template, editable)

- [ ] **Step 6: Create fill-in-the-blank question editor**

Create `components/teacher/card-editor/question-fill-blank.tsx`:
- Score input (number)
- Title/stem textarea (with `___` to mark blanks)
- Dynamic list of blank answers: auto-detect `___` count in title, show one answer input per blank
- Feedback prompt textarea (pre-filled from template)

- [ ] **Step 7: Create short-answer question editor**

Create `components/teacher/card-editor/question-short-answer.tsx`:
- Score input (number)
- Title/stem textarea
- Correct answer textarea
- Feedback prompt textarea (pre-filled from template)

- [ ] **Step 8: Create add question button**

Create `components/teacher/card-editor/add-question-button.tsx`:
- Dropdown menu with 4 options: 自我评测, 多选题, 填空题, 简述题
- On select: adds new empty question of that type to the list

- [ ] **Step 9: Verify card editor end-to-end**

Create a card → open editor → add one of each question type → fill in details → save → reload page → verify data persists. Test drag-and-drop reordering.

- [ ] **Step 10: Commit**

```bash
git add components/teacher/card-editor/ app/teacher/courses/\[courseId\]/classrooms/\[classroomId\]/cards/\[cardId\]/
git commit -m "feat: add learning card editor with all question types and drag-and-drop"
```

---

## Phase 4: Student Experience

### Task 12: Student Layout & Course List

**Files:**
- Create: `app/student/layout.tsx`
- Create: `app/student/courses/page.tsx`
- Create: `lib/actions/student-data.ts`

- [ ] **Step 1: Create student layout**

Create `app/student/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") redirect("/student-login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-semibold">课堂AI学习卡</h1>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground mr-2">{user.name}</span>
        <form action={logout}>
          <Button variant="ghost" size="icon" type="submit">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </header>
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create student data Server Actions**

Create `lib/actions/student-data.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import {
  courseStudents, courses, classrooms, learningCards,
  cardQuestions, studentAnswers,
} from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

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

export async function getStudentCards() {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return [];

  // Get all published cards from courses the student is enrolled in
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
    );

  return result;
}

export async function getCardForStudent(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return null;

  // Verify card exists, is published, and student is enrolled in the course
  const cardResult = await db
    .select({
      card: learningCards,
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

  return {
    card,
    questions,
    existingAnswers: cardAnswers,
  };
}
```

- [ ] **Step 3: Create student courses page**

Create `app/student/courses/page.tsx` — shows published learning cards grouped by course. Each card shows: card name, course name, date, status (已作答/未作答 based on whether all questions have answers). Click navigates to answer page.

- [ ] **Step 4: Verify student course/card listing**

Login as student → see enrolled courses → see published cards.

- [ ] **Step 5: Commit**

```bash
git add app/student/ lib/actions/student-data.ts
git commit -m "feat: add student layout and course/card listing"
```

---

### Task 13: Student Answer Interface

**Files:**
- Create: `app/student/cards/[cardId]/page.tsx`
- Create: `components/student/answer-card.tsx`
- Create: `components/student/self-assessment-answer.tsx`
- Create: `components/student/multiple-choice-answer.tsx`
- Create: `components/student/fill-blank-answer.tsx`
- Create: `components/student/short-answer-answer.tsx`
- Create: `lib/actions/answers.ts`

- [ ] **Step 1: Create answer submission Server Actions**

Create `lib/actions/answers.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { studentAnswers, cardQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function submitAnswer(
  questionId: string,
  answer: unknown,
  deviceType: string
) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return { error: "未授权" };

  // Check if already answered
  const [existing] = await db
    .select()
    .from(studentAnswers)
    .where(
      and(
        eq(studentAnswers.questionId, questionId),
        eq(studentAnswers.studentId, user.id)
      )
    );

  if (existing) return { error: "已提交，不能重复作答" };

  // Get question for type-specific scoring
  const [question] = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.id, questionId));

  if (!question) return { error: "题目不存在" };

  let score: number | null = null;

  // Multiple-choice: auto-grade
  if (question.type === "multiple_choice") {
    const studentAnswer = answer as string[];
    const correctAnswer = JSON.parse(question.correctAnswer || "[]") as string[];
    const isCorrect =
      studentAnswer.length === correctAnswer.length &&
      studentAnswer.every((a) => correctAnswer.includes(a)) &&
      correctAnswer.every((a) => studentAnswer.includes(a));
    score = isCorrect ? question.score : 0;
  }

  // Self-assessment: score is the star rating (stored directly, no point value)
  if (question.type === "self_assessment") {
    const sa = answer as { stars?: number; comment?: string };
    score = sa.stars ?? 0;
  }

  const [result] = await db.insert(studentAnswers).values({
    questionId,
    studentId: user.id,
    answer,
    score,
    deviceType,
  }).returning();

  return { success: true, answerId: result.id, score };
}

// Internal helpers — not exported as server actions to avoid unauthenticated access
async function updateAnswerScore(answerId: string, score: number) {
  await db.update(studentAnswers).set({ score }).where(eq(studentAnswers.id, answerId));
}

async function updateAnswerFeedback(answerId: string, feedback: string) {
  await db.update(studentAnswers).set({ aiFeedback: feedback }).where(eq(studentAnswers.id, answerId));
}
```

- [ ] **Step 2: Create answer page**

Create `app/student/cards/[cardId]/page.tsx` — server component that fetches card data via `getCardForStudent()` and renders list of answer components. Pre-populates submitted answers in disabled state.

- [ ] **Step 3: Create answer components per question type**

Create `components/student/self-assessment-answer.tsx`:
- Star rating (5 clickable stars), auto-submit on click
- Text area for comment with separate submit button
- When submitted: stars disabled, text area disabled

Create `components/student/multiple-choice-answer.tsx`:
- Checkboxes for each option
- Submit button
- On submit: show correct/incorrect, highlight correct answers
- Lock after submission

Create `components/student/fill-blank-answer.tsx`:
- Input fields for each blank
- Submit button → triggers AI scoring
- Show score after submission, then stream AI feedback
- Lock after submission

Create `components/student/short-answer-answer.tsx`:
- Textarea for answer
- Submit button → triggers AI scoring
- Show score after submission, then stream AI feedback
- Lock after submission

- [ ] **Step 4: Add device type detection utility**

Add to `lib/utils.ts`:
```ts
export function getDeviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}
```

- [ ] **Step 5: Verify answer submission flow**

Login as student → open a published card → answer each question type → verify answers saved, questions locked on reload.

- [ ] **Step 6: Commit**

```bash
git add app/student/cards/ components/student/ lib/actions/answers.ts
git commit -m "feat: add student answer interface with per-question submission"
```

---

### Task 14: AI Scoring & Streaming Feedback

**Files:**
- Create: `app/api/ai/score/route.ts`
- Create: `app/api/ai/feedback/route.ts`
- Create: `lib/ai/prompts.ts`
- Create: `lib/ai/scoring.ts`

- [ ] **Step 1: Install Vercel AI SDK**

```bash
npm install ai @ai-sdk/openai
```

- [ ] **Step 2: Create prompt template utility**

Create `lib/ai/prompts.ts`:
```ts
export function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}
```

- [ ] **Step 3: Create AI scoring route**

Create `app/api/ai/score/route.ts`:

Note: Uses Node.js runtime (default) because `postgres` driver is not Edge-compatible. The Vercel AI SDK streaming still works well in Node.js runtime.

```ts
import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { db } from "@/lib/db";
import { cardQuestions, studentAnswers, llmModels, learningCards, classrooms, courses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { fillTemplate } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { questionId, answerId } = await request.json();

  // Get the question
  const [question] = await db.select().from(cardQuestions).where(eq(cardQuestions.id, questionId));
  if (!question || !question.gradingPrompt) {
    return NextResponse.json({ error: "无打分模板" }, { status: 400 });
  }

  // Get the student's answer
  const [answer] = await db.select().from(studentAnswers).where(eq(studentAnswers.id, answerId));
  if (!answer) return NextResponse.json({ error: "答案不存在" }, { status: 404 });

  // Find the teacher's default model via card -> classroom -> course -> teacher
  const [card] = await db.select().from(learningCards).where(eq(learningCards.id, question.cardId));
  const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, card.classroomId));
  const [course] = await db.select().from(courses).where(eq(courses.id, classroom.courseId));
  const [model] = await db.select().from(llmModels).where(
    and(eq(llmModels.teacherId, course.teacherId), eq(llmModels.isDefault, true))
  );

  if (!model) return NextResponse.json({ error: "教师未配置默认模型" }, { status: 400 });

  // Build prompt
  const studentAnswerText = typeof answer.answer === "string"
    ? answer.answer
    : JSON.stringify(answer.answer);

  const prompt = fillTemplate(question.gradingPrompt, {
    "题干": question.title,
    "标准答案": question.correctAnswer || "",
    "学生答案": studentAnswerText,
  });

  // Call LLM
  const openai = createOpenAI({ baseURL: model.baseUrl, apiKey: model.apiKey });
  const { text } = await generateText({
    model: openai(model.modelName),
    prompt,
  });

  // Parse score (0-10)
  const llmScore = Math.min(10, Math.max(0, parseInt(text.trim()) || 0));
  const awardedScore = Math.round((llmScore / 10) * question.score);

  // Update answer
  await db.update(studentAnswers).set({ score: awardedScore }).where(eq(studentAnswers.id, answerId));

  return NextResponse.json({ score: awardedScore, llmScore });
}
```

- [ ] **Step 4: Create AI feedback route (streaming)**

Create `app/api/ai/feedback/route.ts`:

Note: Uses Node.js runtime (default) because `postgres` driver is not Edge-compatible. Streaming still works via Vercel AI SDK's `toDataStreamResponse()`.

```ts
import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { db } from "@/lib/db";
import { cardQuestions, studentAnswers, llmModels, learningCards, classrooms, courses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { fillTemplate } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return new Response("未授权", { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== "student") {
    return new Response("未授权", { status: 401 });
  }

  const { questionId, answerId } = await request.json();

  const [question] = await db.select().from(cardQuestions).where(eq(cardQuestions.id, questionId));
  if (!question || !question.feedbackPrompt) {
    return new Response("无批改模板", { status: 400 });
  }

  const [answer] = await db.select().from(studentAnswers).where(eq(studentAnswers.id, answerId));
  if (!answer) return new Response("答案不存在", { status: 404 });

  // Find teacher's default model
  const [card] = await db.select().from(learningCards).where(eq(learningCards.id, question.cardId));
  const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, card.classroomId));
  const [course] = await db.select().from(courses).where(eq(courses.id, classroom.courseId));
  const [model] = await db.select().from(llmModels).where(
    and(eq(llmModels.teacherId, course.teacherId), eq(llmModels.isDefault, true))
  );

  if (!model) return new Response("教师未配置默认模型", { status: 400 });

  const studentAnswerText = typeof answer.answer === "string"
    ? answer.answer
    : JSON.stringify(answer.answer);

  const prompt = fillTemplate(question.feedbackPrompt, {
    "题干": question.title,
    "标准答案": question.correctAnswer || "",
    "学生答案": studentAnswerText,
    "选项": JSON.stringify(question.options || []),
    "得分": String(answer.score ?? 0),
  });

  const openai = createOpenAI({ baseURL: model.baseUrl, apiKey: model.apiKey });
  const result = streamText({
    model: openai(model.modelName),
    prompt,
  });

  return result.toDataStreamResponse();
}
```

- [ ] **Step 5: Integrate AI scoring into answer components**

Update `fill-blank-answer.tsx` and `short-answer-answer.tsx`:
1. After submit → call `/api/ai/score` with questionId and answerId
2. Display returned score
3. Then call `/api/ai/feedback` using `useCompletion` from `ai/react`
4. Stream feedback text below the question
5. On stream complete: save feedback via `updateAnswerFeedback` Server Action

Update `multiple-choice-answer.tsx`:
1. After submit → auto-grade (already done in Server Action)
2. Call `/api/ai/feedback` for personalized explanation
3. Stream feedback text

- [ ] **Step 6: Verify AI scoring end-to-end**

Submit fill-blank and short-answer questions → verify LLM is called → score appears → feedback streams in. Submit multiple-choice → score instant → feedback streams.

- [ ] **Step 7: Commit**

```bash
git add app/api/ai/ lib/ai/ components/student/
git commit -m "feat: add AI scoring and streaming feedback"
```

---

## Phase 5: Analysis & Templates

### Task 15: Learning Card Analysis

**Files:**
- Create: `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/[cardId]/analysis/page.tsx`
- Create: `components/teacher/analysis/multiple-choice-chart.tsx`
- Create: `components/teacher/analysis/fill-blank-wordcloud.tsx`
- Create: `components/teacher/analysis/short-answer-danmaku.tsx`
- Create: `lib/actions/analysis.ts`

- [ ] **Step 1: Install analysis dependencies**

```bash
npm install recharts react-wordcloud
```

- [ ] **Step 2: Create analysis Server Actions**

Create `lib/actions/analysis.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { cardQuestions, studentAnswers, learningCards, classrooms, courses } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function getCardAnalysis(cardId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return [];

  // Verify ownership
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

      return { question: q, answers };
    })
  );

  return analysisData;
}
```

- [ ] **Step 3: Create multiple-choice analysis chart**

Create `components/teacher/analysis/multiple-choice-chart.tsx`:
- Receives question + answers data
- Calculates selection percentage per option
- Renders bar chart using Recharts
- Shows correct answer highlighted

- [ ] **Step 4: Create fill-in-the-blank word cloud**

Create `components/teacher/analysis/fill-blank-wordcloud.tsx`:
- Receives question + answers data
- Extracts student answer text, counts word frequencies
- Renders word cloud using react-wordcloud
- Shows correct answer above

- [ ] **Step 5: Create short-answer danmaku**

Create `components/teacher/analysis/short-answer-danmaku.tsx`:
- Receives question + answers data
- Renders student answers as scrolling marquee/danmaku effect
- Use CSS animation for horizontal scrolling text
- Multiple rows at different speeds for visual variety

- [ ] **Step 6: Create analysis page**

Create the analysis page that:
- Lists all questions (stems only, no answers by default)
- Each question has an "分析" button
- On click: expands to show the appropriate analysis component based on type
- Self-assessment: skip (no analysis)

- [ ] **Step 7: Verify analysis page**

View analysis for a card with submitted answers. Verify chart renders for MC, word cloud for fill-blank, danmaku for short-answer.

- [ ] **Step 8: Commit**

```bash
git add lib/actions/analysis.ts components/teacher/analysis/ app/teacher/courses/\[courseId\]/classrooms/\[classroomId\]/cards/\[cardId\]/analysis/
git commit -m "feat: add learning card analysis with charts, word cloud, and danmaku"
```

---

### Task 16: Prompt Template Management

**Files:**
- Create: `lib/actions/templates.ts`
- Create: `app/teacher/templates/page.tsx`
- Create: `app/teacher/templates/template-editor.tsx`
- Create: `lib/ai/default-templates.ts`

- [ ] **Step 1: Create default templates constant**

Create `lib/ai/default-templates.ts`:
```ts
export const DEFAULT_TEMPLATES: Record<string, Record<string, string>> = {
  fill_blank: {
    scoring: `题目（含空格）{题干}

标准答案是:每个空的{标准答案}
学生答案是：学生每个空的{学生答案}

你是一位生成式人工智能的专业课程教师，请根据以上信息，为该题目进行打分，要考虑专业知识和语义相似度，分值在0-10分之间，你的输出仅能是一个整数`,
    feedback: `题目（含空格）{题干}

标准答案是:每个空的{标准答案}
学生答案是：每个空的{学生答案}

请给根据以上信息为学生解释标准答案的含义。
如果学生正确，给予鼓励！
如果学生错误，解释下学生的作答为何出错以及后续的注意问题。`,
  },
  short_answer: {
    scoring: `题目：{题干}

标准答案是:{标准答案}
学生答案是：{学生答案}

你是一位生成式人工智能的专业课程教师，请根据以上信息，为该题目进行打分，要考虑专业知识和语义相似度，分值在0-10分之间，你的输出仅能是一个整数`,
    feedback: `题目{题干}

标准答案是:{标准答案}
学生答案是：{学生答案}

请给根据以上信息为学生解释标准答案的含义。
如果学生正确，给予鼓励！
如果学生错误，解释下学生的作答为何出错以及后续的注意问题。`,
  },
  multiple_choice: {
    feedback: `题目{题干}
所有{选项}

标准答案是:{标准答案}
学生答案是：{学生答案}

请给根据以上信息为学生解释标准答案的含义。
如果学生正确，给予鼓励！
如果学生错误，解释下学生的作答为何出错以及后续的注意问题。`,
  },
};
```

- [ ] **Step 2: Create template Server Actions**

Create `lib/actions/templates.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { promptTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DEFAULT_TEMPLATES } from "@/lib/ai/default-templates";

export async function getTemplates() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return [];
  return db.select().from(promptTemplates).where(eq(promptTemplates.teacherId, user.id));
}

export async function getTemplateOrDefault(
  teacherId: string,
  questionType: string,
  templateKind: string
): Promise<string> {
  const [template] = await db
    .select()
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.teacherId, teacherId),
        eq(promptTemplates.questionType, questionType),
        eq(promptTemplates.templateKind, templateKind)
      )
    );

  if (template) return template.content;
  return DEFAULT_TEMPLATES[questionType]?.[templateKind] ?? "";
}

export async function saveTemplate(
  questionType: string,
  templateKind: string,
  content: string
) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return { error: "未授权" };

  await db
    .insert(promptTemplates)
    .values({
      teacherId: user.id,
      questionType,
      templateKind,
      content,
    })
    .onConflictDoUpdate({
      target: [promptTemplates.teacherId, promptTemplates.questionType, promptTemplates.templateKind],
      set: { content, updatedAt: new Date() },
    });

  revalidatePath("/teacher/templates");
  return { success: true };
}
```

- [ ] **Step 3: Create templates page**

Create `app/teacher/templates/page.tsx` and `app/teacher/templates/template-editor.tsx`:
- Page shows grouped sections by question type (多选题, 填空题, 简述题)
- Each section shows the applicable templates (scoring and/or feedback)
- Each template has a textarea editor showing current content (custom or default)
- "恢复默认" button to reset to default template
- "保存" button per template
- Placeholder reference guide displayed (e.g. `{题干}`, `{标准答案}`, etc.)

- [ ] **Step 4: Integrate templates into card editor**

Update the card editor question components to pre-fill `feedbackPrompt` and `gradingPrompt` fields using `getTemplateOrDefault()` when creating a new question.

- [ ] **Step 5: Verify template management**

Edit a template → save → create new question → verify pre-filled prompt uses custom template. Reset to default → verify default content restored.

- [ ] **Step 6: Commit**

```bash
git add lib/ai/default-templates.ts lib/actions/templates.ts app/teacher/templates/
git commit -m "feat: add prompt template management with defaults and customization"
```

---

### Task 17: Final Integration & Polish

**Files:**
- Modify: various files for polish

- [ ] **Step 1: Verify build succeeds**

```bash
npm run build
```

Fix any TypeScript errors or build issues.

- [ ] **Step 2: Run linting**

```bash
npm run lint
```

Fix any linting issues.

- [ ] **Step 3: Test complete user flow**

Manual test checklist:
1. Teacher registers → logs in
2. Configures LLM model (set as default)
3. Creates course
4. Imports students via Excel
5. Creates classroom
6. Creates learning card with all 4 question types
7. Sets scores totaling 100 → publishes
8. Student logs in (student_no + name from imported Excel)
9. Sees published card → answers all questions
10. AI scores fill-blank and short-answer, feedback streams
11. Teacher views analysis page with charts/wordcloud/danmaku

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "feat: complete iClassCard system with all feature modules"
```
