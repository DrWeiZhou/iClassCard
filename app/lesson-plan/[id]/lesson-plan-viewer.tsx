"use client";

import { useEffect } from "react";

export function LessonPlanViewer({ htmlContent }: { htmlContent: string }) {
  useEffect(() => {
    // Scroll to anchor after render
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, []);

  return (
    <div
      className="prose prose-sm max-w-none
        prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg
        prose-table:border prose-td:border prose-td:p-2 prose-th:border prose-th:p-2
        prose-headings:scroll-mt-4"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
