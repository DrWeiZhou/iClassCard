import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getTemplates } from "@/lib/actions/templates";
import { TemplateEditor } from "./template-editor";

export default async function TemplatesPage() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const templates = await getTemplates();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">模板维护</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理 AI 打分和批改反馈的提示词模板，各题型可分别自定义
        </p>
      </div>
      <TemplateEditor templates={templates} />
    </div>
  );
}
