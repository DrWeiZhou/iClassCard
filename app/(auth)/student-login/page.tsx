"use client";

import { useActionState } from "react";
import { loginStudent } from "@/lib/actions/auth";
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

export default function StudentLoginPage() {
  const [state, formAction, isPending] = useActionState(loginStudent, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">学生登录</CardTitle>
        <CardDescription>使用学号和密码登录（初始密码为学号）</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="studentNo">学号</Label>
            <Input
              id="studentNo"
              name="studentNo"
              placeholder="请输入学号"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="请输入密码"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "登录中..." : "登录"}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/" className="text-primary hover:underline">
              返回首页
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
