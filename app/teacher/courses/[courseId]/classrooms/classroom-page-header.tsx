"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClassroomFormDialog } from "./classroom-form-dialog";

export function ClassroomPageHeader({
  courseId,
  classroomCount,
  defaultInstructor,
}: {
  courseId: string;
  classroomCount: number;
  defaultInstructor: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-medium">
        课堂管理
        <span className="ml-2 text-sm text-muted-foreground">
          ({classroomCount} 个课堂)
        </span>
      </h2>
      <Button onClick={() => setCreateOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        新建课堂
      </Button>
      <ClassroomFormDialog
        courseId={courseId}
        mode="create"
        defaultInstructor={defaultInstructor}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
