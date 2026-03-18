import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { Sidebar } from "@/components/teacher/sidebar";
import { Header } from "@/components/teacher/header";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden lg:flex w-64" />
      <div className="flex flex-1 flex-col">
        <Header teacherName={user.name} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
