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

export async function registerTeacher(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    college: formData.get("college"),
    major: formData.get("major"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, college, major, phone, password } = parsed.data;

  const existing = await db
    .select()
    .from(teachers)
    .where(eq(teachers.phone, phone));
  if (existing.length > 0) {
    return { error: "该手机号已注册" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [teacher] = await db
    .insert(teachers)
    .values({
      name,
      college,
      major,
      phone,
      passwordHash,
    })
    .returning();

  await setAuthCookie({
    id: teacher.id,
    role: "teacher",
    name: teacher.name,
  });
  redirect("/teacher/courses");
}

export async function loginTeacher(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!phone || !password) {
    return { error: "请输入手机号和密码" };
  }

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.phone, phone));
  if (!teacher) {
    return { error: "手机号或密码错误" };
  }

  const valid = await bcrypt.compare(password, teacher.passwordHash);
  if (!valid) {
    return { error: "手机号或密码错误" };
  }

  await setAuthCookie({
    id: teacher.id,
    role: "teacher",
    name: teacher.name,
  });
  redirect("/teacher/courses");
}

export async function loginStudent(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const studentNo = formData.get("studentNo") as string;
  const password = formData.get("password") as string;

  if (!studentNo || !password) {
    return { error: "请输入学号和密码" };
  }

  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.studentNo, studentNo));

  if (!student) {
    return { error: "学号或密码错误" };
  }

  // Verify password: if no passwordHash set (legacy), compare with studentNo directly
  if (student.passwordHash) {
    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) {
      return { error: "学号或密码错误" };
    }
  } else {
    // Legacy student without password hash - default password is studentNo
    if (password !== student.studentNo) {
      return { error: "学号或密码错误" };
    }
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
