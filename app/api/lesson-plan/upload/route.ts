import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";
import { db } from "@/lib/db";
import {
  lessonPlans,
  lessonPlanSections,
  learningCards,
  cardQuestions,
  classrooms,
  courses,
  llmModels,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

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

  // Clean up <pre><code> blocks: strip nested <code> tags, convert <br /> to newlines
  codeProcessed = codeProcessed.replace(
    /<pre><code>([\s\S]*?)<\/code><\/pre>/gi,
    (match, content) => {
      const cleaned = content
        .replace(/<code>/gi, "")
        .replace(/<\/code>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<a[^>]*><\/a>/gi, "") // strip empty anchors inside code
        .trim();
      return `<pre><code>${cleaned}</code></pre>`;
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

  // Add lazy loading to all images
  const lazyHtml = processedHtml.replace(/<img /gi, '<img loading="lazy" ');

  // Sanitize HTML: allow standard tags, strip scripts and event handlers
  const sanitized = sanitizeHtml(lazyHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img", "h1", "h2", "h3", "h4", "h5", "h6",
      "table", "thead", "tbody", "tr", "th", "td",
      "figure", "figcaption", "sup", "sub", "pre", "code",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height", "style", "loading"],
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
        styleMap: [
          "p[style-name='Source Code'] => pre > code:separator('\\n')",
          "p[style-name='SourceCode'] => pre > code:separator('\\n')",
          "r[style-name='NormalTok'] =>",
          "r[style-name='OperatorTok'] =>",
          "r[style-name='StringTok'] =>",
          "r[style-name='BuiltInTok'] =>",
          "r[style-name='DecValTok'] =>",
          "r[style-name='KeywordTok'] =>",
          "r[style-name='CommentTok'] =>",
          "r[style-name='DataTypeTok'] =>",
          "r[style-name='FunctionTok'] =>",
          "r[style-name='ImportTok'] =>",
          "r[style-name='ControlFlowTok'] =>",
          "r[style-name='FloatTok'] =>",
          "r[style-name='CharTok'] =>",
          "r[style-name='SpecialCharTok'] =>",
          "r[style-name='VariableTok'] =>",
          "r[style-name='OtherTok'] =>",
          "r[style-name='PreprocessorTok'] =>",
          "r[style-name='ErrorTok'] =>",
          "r[style-name='AttributeTok'] =>",
          "r[style-name='ConstantTok'] =>",
          "r[style-name='BaseNTok'] =>",
          "r[style-name='AlertTok'] =>",
          "r[style-name='AnnotationTok'] =>",
          "r[style-name='RegionMarkerTok'] =>",
          "r[style-name='InformationTok'] =>",
          "r[style-name='WarningTok'] =>",
          "r[style-name='DocumentationTok'] =>",
          "r[style-name='SpecialStringTok'] =>",
          "r[style-name='VerbatimStringTok'] =>",
          "r[style-name='CommentVarTok'] =>",
          "r[style-name='ExtensionTok'] =>",
        ],
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

    // Re-match existing self-assessment questions against new plan sections
    if (sections.length > 0) {
      try {
        // Find all self-assessment questions in this classroom's cards
        const selfAssessmentQs = await db
          .select({
            id: cardQuestions.id,
            title: cardQuestions.title,
          })
          .from(cardQuestions)
          .innerJoin(learningCards, eq(cardQuestions.cardId, learningCards.id))
          .where(
            and(
              eq(learningCards.classroomId, classroomId),
              eq(cardQuestions.type, "self_assessment")
            )
          );

        if (selfAssessmentQs.length > 0) {
          // Get new sections with DB IDs
          const newSections = await db
            .select()
            .from(lessonPlanSections)
            .where(eq(lessonPlanSections.lessonPlanId, newPlanId))
            .orderBy(lessonPlanSections.sectionOrder);

          // Resolve teacher's default LLM
          const [course] = await db
            .select()
            .from(courses)
            .where(eq(courses.id, authResult[0].courseId));
          const [model] = await db
            .select()
            .from(llmModels)
            .where(
              and(eq(llmModels.teacherId, course.teacherId), eq(llmModels.isDefault, true))
            );

          if (model && newSections.length > 0) {
            const headingList = newSections
              .map((s, i) => `${i + 1}. ${s.headingText}`)
              .join("\n");
            const questionList = selfAssessmentQs
              .map((q, i) => `${i + 1}. ${q.title}`)
              .join("\n");

            const prompt = `你是一个教案标题匹配助手。给定多个学习内容名称和一组教案标题，为每个学习内容找出最匹配的教案标题。

学习内容列表：
${questionList}

教案标题列表：
${headingList}

请为每个学习内容返回最匹配的教案标题序号(从1开始)，如果没有合适的匹配返回0。
格式：每行一个，"学习内容序号:教案标题序号"，例如：
1:3
2:0
3:1`;

            const openai = createOpenAI({ baseURL: model.baseUrl, apiKey: model.apiKey });
            const { text } = await generateText({
              model: openai(model.modelName),
              prompt,
            });

            // Parse batch response: "1:3\n2:0\n3:1"
            const lines = text.trim().split("\n");
            for (const line of lines) {
              const match = line.match(/(\d+)\s*[:：]\s*(\d+)/);
              if (!match) continue;
              const qIdx = parseInt(match[1]) - 1;
              const sIdx = parseInt(match[2]) - 1;
              if (qIdx < 0 || qIdx >= selfAssessmentQs.length) continue;

              const question = selfAssessmentQs[qIdx];
              if (sIdx >= 0 && sIdx < newSections.length) {
                const section = newSections[sIdx];
                await db
                  .update(cardQuestions)
                  .set({
                    matchedSectionId: section.id,
                    matchedLessonPlanUrl: `/lesson-plan/${newPlanId}#${section.anchorId}`,
                  })
                  .where(eq(cardQuestions.id, question.id));
              } else {
                await db
                  .update(cardQuestions)
                  .set({ matchedSectionId: null, matchedLessonPlanUrl: null })
                  .where(eq(cardQuestions.id, question.id));
              }
            }
          }
        }
      } catch (matchError) {
        // Re-matching is non-critical; log but don't fail the upload
        console.error("Re-matching error:", matchError);
      }
    }

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
