"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, BookOpen, MessageCircle, MapPin, User } from "lucide-react";
import { deleteClassroom } from "@/lib/actions/classrooms";
import { toast } from "sonner";
import { ClassroomFormDialog } from "./classroom-form-dialog";

type Classroom = {
  id: string;
  courseId: string;
  date: string;
  time: string;
  name: string | null;
  room: string | null;
  instructor: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function ClassroomList({
  classrooms,
  courseId,
  defaultInstructor,
}: {
  classrooms: Classroom[];
  courseId: string;
  defaultInstructor: string;
}) {
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(
    null
  );

  if (classrooms.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        暂无课堂，请点击&quot;新建课堂&quot;添加
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((classroom) => (
          <ClassroomCard
            key={classroom.id}
            classroom={classroom}
            courseId={courseId}
            onEdit={() => setEditingClassroom(classroom)}
          />
        ))}
      </div>

      <ClassroomFormDialog
        courseId={courseId}
        mode="edit"
        classroom={editingClassroom ?? undefined}
        defaultInstructor={defaultInstructor}
        open={editingClassroom !== null}
        onOpenChange={(open) => {
          if (!open) setEditingClassroom(null);
        }}
      />
    </>
  );
}

function ClassroomCard({
  classroom,
  courseId,
  onEdit,
}: {
  classroom: Classroom;
  courseId: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClassroom(courseId, classroom.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("课堂已删除");
      }
    });
  }

  function handleCardsClick() {
    router.push(
      `/teacher/courses/${courseId}/classrooms/${classroom.id}/cards`
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {classroom.name || `${classroom.date} 课堂`}
        </CardTitle>
        <CardDescription>
          {classroom.date} {classroom.time}
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onEdit}
              disabled={isPending}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                  />
                }
              >
                <Trash2 className="h-4 w-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除该课堂吗？此操作将同时删除该课堂下的所有学习卡数据，且不可撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {classroom.room && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{classroom.room}</span>
            </div>
          )}
          {classroom.instructor && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>{classroom.instructor}</span>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCardsClick}
            disabled={isPending}
          >
            <BookOpen className="mr-1.5 h-4 w-4" />
            AI学习卡
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/teacher/courses/${courseId}/classrooms/${classroom.id}/discussions`
              )
            }
            disabled={isPending}
          >
            <MessageCircle className="mr-1.5 h-4 w-4" />
            AI交流卡
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
