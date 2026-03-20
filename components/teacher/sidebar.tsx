"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, BrainCircuit, CalendarDays, FileText, GraduationCap, User } from "lucide-react";

const navItems = [
  { href: "/teacher/courses", label: "课程管理", icon: BookOpen },
  { href: "/teacher/classrooms", label: "课堂管理", icon: CalendarDays },
  { href: "/teacher/models", label: "模型管理", icon: BrainCircuit },
  { href: "/teacher/templates", label: "模板维护", icon: FileText },
  { href: "/teacher/profile", label: "个人信息", icon: User },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col border-r bg-muted/40", className)}>
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/teacher/courses" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5" />
          <span>智慧课堂AI学习本</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}
