"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type LessonPlanInfo = {
  id: string;
  fileName: string;
  sectionCount: number;
} | null;

export function LessonPlanUpload({
  classroomId,
  existingPlan,
}: {
  classroomId: string;
  existingPlan: LessonPlanInfo;
}) {
  const [plan, setPlan] = useState<LessonPlanInfo>(existingPlan);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      toast.error("请上传 .docx 格式的文件");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("classroomId", classroomId);

      const response = await fetch("/api/lesson-plan/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "上传失败");
        return;
      }

      setPlan({
        id: data.lessonPlanId,
        fileName: data.fileName,
        sectionCount: data.sectionCount,
      });
      toast.success(`教案上传成功，识别到 ${data.sectionCount} 个标题`);
    });

    // Reset input so same file can be re-uploaded
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {plan ? (
        <>
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{plan.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {plan.sectionCount} 个标题章节
            </p>
          </div>
          <Link href={`/student/lesson-plan/${plan.id}`} target="_blank">
            <Button variant="ghost" size="sm" title="预览教案">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpload}
            disabled={isPending}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            {isPending ? "上传中..." : "重新上传"}
          </Button>
        </>
      ) : (
        <>
          <div className="flex-1 text-sm text-muted-foreground">
            上传教案（.docx）可为自评题自动匹配精准教案章节
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpload}
            disabled={isPending}
          >
            <Upload className="mr-1 h-3 w-3" />
            {isPending ? "上传中..." : "上传教案"}
          </Button>
        </>
      )}
    </div>
  );
}
