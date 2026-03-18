import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Menu, LogOut } from "lucide-react";
import { Sidebar } from "./sidebar";
import { logout } from "@/lib/actions/auth";

export function Header({ teacherName }: { teacherName: string }) {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:px-6">
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="outline" size="icon" className="shrink-0 lg:hidden" />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>
      <div className="flex-1" />
      <span className="text-sm text-muted-foreground">{teacherName}</span>
      <form action={logout}>
        <Button variant="ghost" size="icon" type="submit">
          <LogOut className="h-4 w-4" />
        </Button>
      </form>
    </header>
  );
}
