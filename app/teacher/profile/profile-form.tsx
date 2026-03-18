"use client";

import { useActionState, useEffect } from "react";
import { updateTeacherProfile } from "@/lib/actions/teachers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";

type Teacher = {
  id: string;
  name: string;
  college: string;
  major: string;
  phone: string;
};

export function ProfileForm({ teacher }: { teacher: Teacher }) {
  const [state, formAction, isPending] = useActionState(updateTeacherProfile, null);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("个人信息已保存");
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>编辑个人信息</CardTitle>
        <CardDescription>修改您的基本信息</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              name="name"
              defaultValue={teacher.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="college">学院</Label>
            <Input
              id="college"
              name="college"
              defaultValue={teacher.college}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="major">专业</Label>
            <Input
              id="major"
              name="major"
              defaultValue={teacher.major}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={teacher.phone}
              disabled
            />
            <p className="text-xs text-muted-foreground">手机号不可修改</p>
          </div>

          {state && "error" in state && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "保存中..." : "保存"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
