import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getModels } from "@/lib/actions/models";
import { ModelTable } from "./model-table";
import { ModelsPageHeader } from "./models-page-header";

export default async function ModelsPage() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const models = await getModels();

  return (
    <div className="mx-auto max-w-4xl">
      <ModelsPageHeader />
      <ModelTable models={models} />
    </div>
  );
}
