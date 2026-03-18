import { redirect } from "next/navigation";
import { getTeacherProfile } from "@/lib/actions/teachers";
import { ProfileForm } from "./profile-form";

export default async function TeacherProfilePage() {
  const teacher = await getTeacherProfile();
  if (!teacher) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">个人信息</h1>
      <ProfileForm teacher={teacher} />
    </div>
  );
}
