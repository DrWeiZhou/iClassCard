import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getTemplates, getRatingSettings } from "@/lib/actions/templates";
import { TemplateEditor } from "./template-editor";
import { RatingSettingsEditor } from "./rating-settings-editor";

export default async function TemplatesPage() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const [templates, ratingSettings] = await Promise.all([
    getTemplates(),
    getRatingSettings(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">设置与模板维护</h1>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">个性化评测</h2>
          <RatingSettingsEditor initialSettings={ratingSettings} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">提示词模板</h2>
          <p className="text-sm text-muted-foreground mb-4">
            管理 AI 打分和批改反馈的提示词模板，各题型可分别自定义
          </p>
          <TemplateEditor templates={templates} />
        </div>
      </div>
    </div>
  );
}
