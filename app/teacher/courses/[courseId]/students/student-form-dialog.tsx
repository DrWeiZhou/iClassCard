"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addStudent } from "@/lib/actions/students";
import { toast } from "sonner";

export function StudentFormDialog({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await addStudent(courseId, null, formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (result && "success" in result && result.success) {
        toast.success("学生已添加");
        setOpen(false);
        setError(null);
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>添加学生</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加学生</DialogTitle>
            <DialogDescription>
              手动添加一名学生到本课程
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentNo">学号 *</Label>
                <Input
                  id="studentNo"
                  name="studentNo"
                  placeholder="请输入学号"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">姓名 *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="请输入姓名"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">性别</Label>
                <Input
                  id="gender"
                  name="gender"
                  placeholder="男/女"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="college">学院</Label>
                <Input
                  id="college"
                  name="college"
                  placeholder="请输入学院"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">年级</Label>
                <Input
                  id="grade"
                  name="grade"
                  placeholder="请输入年级"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">专业</Label>
                <Input
                  id="major"
                  name="major"
                  placeholder="请输入专业"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">班级</Label>
                <Input
                  id="class"
                  name="class"
                  placeholder="请输入班级"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">手机号码</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="请输入手机号码"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">电子邮箱</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="请输入邮箱"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRetake"
                name="isRetake"
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isRetake" className="text-sm font-normal">
                是否重修
              </Label>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                取消
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "添加中..." : "添加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
