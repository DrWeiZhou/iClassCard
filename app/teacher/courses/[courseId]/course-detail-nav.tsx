"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "课堂管理", segment: "classrooms" },
  { label: "学生管理", segment: "students" },
];

export function CourseDetailNav({ courseId }: { courseId: string }) {
  const pathname = usePathname();

  return (
    <nav className="inline-flex h-8 items-center gap-1 rounded-lg bg-muted p-[3px] text-muted-foreground">
      {navItems.map((item) => {
        const href = `/teacher/courses/${courseId}/${item.segment}`;
        const isActive = pathname.startsWith(href);

        return (
          <Link
            key={item.segment}
            href={href}
            className={cn(
              "inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
