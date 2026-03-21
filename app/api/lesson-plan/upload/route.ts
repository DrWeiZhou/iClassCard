import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";
import { db } from "@/lib/db";
import {
  lessonPlans,
  lessonPlanSections,
  classrooms,
  courses,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

function processHtml(rawHtml: string): {
  html: string;
  sections: Array<{
    headingLevel: number;
    headingText: string;
    anchorId: string;
    sectionOrder: number;
  }>;
} {
  const sections: Array<{
    headingLevel: number;
    headingText: string;
    anchorId: string;
    sectionOrder: number;
  }> = [];

  let sectionIndex = 0;

  // Convert single-cell tables (1 row, 1 column, no header) to code blocks
  // Word often represents code blocks as borderless single-cell tables
  let codeProcessed = rawHtml.replace(
    /<table[^>]*>\s*<tbody>\s*<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>\s*<\/tbody>\s*<\/table>/gi,
    (match, content) => {
      // Strip inner HTML tags, preserve line breaks
      const text = content
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .trim();
      if (text) {
        return `<pre><code>${text}</code></pre>`;
      }
      return match;
    }
  );

  // Inject anchor IDs into headings and extract section info
  const processedHtml = codeProcessed.replace(
    /<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs, content) => {
      const level = parseInt(tag.charAt(1));
      const anchorId = `section-${sectionIndex}`;
      // Strip HTML tags from heading text for storage
      const textContent = content.replace(/<[^>]*>/g, "").trim();

      if (textContent) {
        sections.push({
          headingLevel: level,
          headingText: textContent,
          anchorId,
          sectionOrder: sectionIndex,
        });
        sectionIndex++;
        return `<${tag}${attrs} id="${anchorId}">${content}</${tag}>`;
      }
      return match;
    }
  );

  // Sanitize HTML: allow standard tags, strip scripts and event handlers
  const sanitized = sanitizeHtml(processedHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img", "h1", "h2", "h3", "h4", "h5", "h6",
      "table", "thead", "tbody", "tr", "th", "td",
      "figure", "figcaption", "sup", "sub", "pre", "code",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height", "style"],
      h1: ["id"], h2: ["id"], h3: ["id"],
      h4: ["id"], h5: ["id"], h6: ["id"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
      "*": ["style"],
    },
    allowedSchemes: ["data", "https", "http"],
  });

  return { html: sanitized, sections };
}

export async function POST(request: NextRequest) {
  // Auth check
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const classroomId = formData.get("classroomId") as string | null;

  if (!file || !classroomId) {
    return NextResponse.json({ error: "缺少文件或课堂ID" }, { status: 400 });
  }

  // Verify teacher owns this classroom
  const authResult = await db
    .select({ courseId: courses.id })
    .from(classrooms)
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(classrooms.id, classroomId), eq(courses.teacherId, user.id)));

  if (authResult.length === 0) {
    return NextResponse.json({ error: "未授权" }, { status: 403 });
  }

  try {
    // Convert docx to HTML using mammoth
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { buffer: Buffer.from(arrayBuffer) },
      {
        convertImage: mammoth.images.imgElement(function (image) {
          return image.read("base64").then(function (imageBuffer) {
            const contentType = image.contentType || "image/png";
            return { src: `data:${contentType};base64,${imageBuffer}` };
          });
        }),
      }
    );

    const { html, sections } = processHtml(result.value);

    // Database transaction: delete old, insert new
    let newPlanId: string = "";
    await db.transaction(async (tx) => {
      // Delete existing lesson plan for this classroom (cascade deletes sections)
      await tx
        .delete(lessonPlans)
        .where(eq(lessonPlans.classroomId, classroomId));

      // Insert new lesson plan
      const [newPlan] = await tx
        .insert(lessonPlans)
        .values({
          classroomId,
          fileName: file.name,
          htmlContent: html,
        })
        .returning();

      newPlanId = newPlan.id;

      // Insert sections
      if (sections.length > 0) {
        await tx.insert(lessonPlanSections).values(
          sections.map((s) => ({
            lessonPlanId: newPlan.id,
            ...s,
          }))
        );
      }
    });

    return NextResponse.json({
      success: true,
      lessonPlanId: newPlanId,
      sectionCount: sections.length,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Lesson plan upload error:", error);
    return NextResponse.json({ error: "教案解析失败" }, { status: 500 });
  }
}
