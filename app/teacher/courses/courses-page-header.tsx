"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CourseFormDialog } from "./course-form-dialog";

export function CoursesPageHeader() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold">课程管理</h1>
      <Button onClick={() => setCreateOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        新建课程
      </Button>
      <CourseFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
