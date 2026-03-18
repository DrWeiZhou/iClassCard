"use client";

import { useActionState } from "react";
import { loginTeacher } from "@/lib/actions/auth";
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

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginTeacher, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">教师登录</CardTitle>
        <CardDescription>使用手机号和密码登录</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {state.error}
            </div>
          )}
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
              placeholder="请输入密码"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "登录中..." : "登录"}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            还没有账号？{" "}
            <Link href="/register" className="text-primary hover:underline">
              注册
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
