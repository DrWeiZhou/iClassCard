"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import { createClassroom, updateClassroom } from "@/lib/actions/classrooms";
import { toast } from "sonner";

type Classroom = {
  id: string;
  courseId: string;
  courseName: string;
  date: string;
  time: string;
  name: string | null;
  room: string | null;
  instructor: string | null;
  notes: string | null;
};

type Course = {
  id: string;
  name: string;
};

type Props = {
  courses: Course[];
  mode: "create" | "edit";
  classroom?: Classroom;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ClassroomFormDialogGlobal(props: Props) {
  // Use key to reset inner form state when classroom changes
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <ClassroomFormInner key={props.classroom?.id ?? "create"} {...props} />
      </DialogContent>
    </Dialog>
  );
}

function ClassroomFormInner({
  courses,
  mode,
  classroom,
  onOpenChange,
}: Props) {
  const isEdit = mode === "edit";
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    classroom?.courseId ?? (courses.length === 1 ? courses[0].id : "")
  );

  const boundAction =
    isEdit && classroom
      ? updateClassroom.bind(null, classroom.courseId, classroom.id)
      : selectedCourseId
        ? createClassroom.bind(null, selectedCourseId)
        : createClassroom.bind(null, "");

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
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "编辑课堂" : "新建课堂"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "修改课堂信息" : "添加一个新的课堂"}
        </DialogDescription>
      </DialogHeader>
      <form action={formAction} className="space-y-4">
        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="courseId">所属课程 *</Label>
            <Select
              value={selectedCourseId}
              onValueChange={(v) => setSelectedCourseId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择课程" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isEdit && classroom && (
          <div className="text-sm text-muted-foreground">
            所属课程：{classroom.courseName}
          </div>
        )}

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
            defaultValue={classroom?.instructor ?? ""}
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
          <Button
            type="submit"
            disabled={isPending || (!isEdit && !selectedCourseId)}
          >
            {isPending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
