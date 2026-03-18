"use client";

import { useActionState, useEffect, useRef } from "react";
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
import { createClassroom, updateClassroom } from "@/lib/actions/classrooms";
import { toast } from "sonner";

type Classroom = {
  id: string;
  date: string;
  time: string;
  name: string | null;
  room: string | null;
  instructor: string | null;
  notes: string | null;
};

type ClassroomFormDialogProps = {
  courseId: string;
  mode: "create" | "edit";
  classroom?: Classroom;
  defaultInstructor?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ClassroomFormDialog({
  courseId,
  mode,
  classroom,
  defaultInstructor,
  open,
  onOpenChange,
}: ClassroomFormDialogProps) {
  const isEdit = mode === "edit";

  const boundAction =
    isEdit && classroom
      ? updateClassroom.bind(null, courseId, classroom.id)
      : createClassroom.bind(null, courseId);

  const [state, formAction, isPending] = useActionState(boundAction, null);
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (state && state !== prevStateRef.current) {
      prevStateRef.current = state;
      if ("success" in state && state.success) {
        toast.success(isEdit ? "课堂已更新" : "课堂已创建");
        onOpenChange(false);
      } else if ("error" in state && state.error) {
        toast.error(state.error);
      }
    }
  }, [state, isEdit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑课堂" : "新建课堂"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改课堂信息" : "添加一个新的课堂"}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">日期 *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={classroom?.date ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">时间 *</Label>
              <Input
                id="time"
                name="time"
                defaultValue={classroom?.time ?? ""}
                placeholder="例如：10:00-11:30"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">课堂名称</Label>
              <Input
                id="name"
                name="name"
                defaultValue={classroom?.name ?? ""}
                placeholder="请输入课堂名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">课堂教室</Label>
              <Input
                id="room"
                name="room"
                defaultValue={classroom?.room ?? ""}
                placeholder="请输入教室"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructor">授课教师</Label>
            <Input
              id="instructor"
              name="instructor"
              defaultValue={
                classroom?.instructor ?? defaultInstructor ?? ""
              }
              placeholder="请输入授课教师"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={classroom?.notes ?? ""}
              placeholder="请输入备注"
            />
          </div>

          {state && "error" in state && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
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
