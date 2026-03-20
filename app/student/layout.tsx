import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") redirect("/student-login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-semibold">智慧课堂AI学习本</h1>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground mr-2">{user.name}</span>
        <form action={logout}>
          <Button variant="ghost" size="icon" type="submit">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </header>
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">{children}</main>
    </div>
  );
}
