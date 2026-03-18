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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCourse, updateCourse } from "@/lib/actions/courses";
import { toast } from "sonner";

type Course = {
  id: string;
  year: string;
  semester: string;
  name: string;
  studentCount: number;
  classComposition: string | null;
};

type CourseFormDialogProps = {
  mode: "create" | "edit";
  course?: Course;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CourseFormDialog({
  mode,
  course,
  open,
  onOpenChange,
}: CourseFormDialogProps) {
  const isEdit = mode === "edit";
  const [semester, setSemester] = useState(course?.semester ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      let result;
      if (isEdit && course) {
        result = await updateCourse(course.id, null, formData);
      } else {
        result = await createCourse(null, formData);
      }

      if (result && "error" in result && result.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (result && "success" in result && result.success) {
        toast.success(isEdit ? "课程已更新" : "课程已创建");
        onOpenChange(false);
        setError(null);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑课程" : "新建课程"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改课程信息" : "创建一个新的课程"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="year">学年</Label>
            <Input
              id="year"
              name="year"
              defaultValue={course?.year ?? ""}
              placeholder="例如：2025-2026"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="semester">学期</Label>
            <Select
              name="semester"
              value={semester}
              onValueChange={(value) => setSemester(value ?? "")}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择学期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="第一学期">第一学期</SelectItem>
                <SelectItem value="第二学期">第二学期</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">课程名称</Label>
            <Input
              id="name"
              name="name"
              defaultValue={course?.name ?? ""}
              placeholder="请输入课程名称"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentCount">人数</Label>
            <Input
              id="studentCount"
              name="studentCount"
              type="number"
              min={0}
              defaultValue={course?.studentCount ?? 0}
              placeholder="请输入学生人数"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="classComposition">教学班组成</Label>
            <Textarea
              id="classComposition"
              name="classComposition"
              defaultValue={course?.classComposition ?? ""}
              placeholder="请输入教学班组成信息（可选）"
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              取消
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
