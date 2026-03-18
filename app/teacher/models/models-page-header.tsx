"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ModelFormDialog } from "./model-form-dialog";

export function ModelsPageHeader() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold">模型管理</h1>
      <Button onClick={() => setCreateOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        新建模型
      </Button>
      <ModelFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
