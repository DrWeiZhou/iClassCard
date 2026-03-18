"use client";

import { useActionState } from "react";
import { registerTeacher } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(
    registerTeacher,
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">教师注册</CardTitle>
        <CardDescription>创建新的教师账号</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              name="name"
              placeholder="请输入姓名"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="college">学院</Label>
            <Input
              id="college"
              name="college"
              placeholder="请输入学院"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="major">专业</Label>
            <Input
              id="major"
              name="major"
              placeholder="请输入专业"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="请输入手机号"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="密码至少6位"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "注册中..." : "注册"}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            已有账号？{" "}
            <Link href="/login" className="text-primary hover:underline">
              登录
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
