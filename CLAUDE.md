# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iClassCard (课堂AI学习卡) — An AI-powered interactive classroom response card system. Teachers create courses, manage students, and publish AI-graded learning cards (quizzes). Students answer questions and receive personalized AI feedback via LLM integration.

Two roles: **Teacher** (manages courses, students, classrooms, learning cards, LLM configs, prompt templates) and **Student** (views assigned cards, answers questions, receives AI-scored feedback).

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Edge Runtime for AI streaming)
- **UI**: Shadcn UI + Tailwind CSS (responsive: mobile-first, max-width on desktop)
- **AI/Streaming**: Vercel AI SDK (`useChat` for streaming LLM responses)
- **Database**: Supabase (PostgreSQL with pgvector for RAG/embeddings)
- **ORM**: Drizzle ORM (supports `vector` column type for Supabase pgvector)
- **Deployment**: Vercel
- **Language**: TypeScript

## Build & Dev Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (Next.js)
npm run build        # production build
npm run lint         # run ESLint
```

## Architecture Notes

- Use Next.js **App Router** (`app/` directory) with Server Actions for Supabase CRUD — minimizes client-side code and improves mobile load performance.
- AI streaming API routes should use **Edge Runtime** for lower latency on mobile.
- LLM scoring uses prompt templates with `{}` placeholders (e.g., `{题干}`, `{标准答案}`, `{学生答案}`) that get filled at runtime. Templates are teacher-editable per question type.
- Question types: self-assessment (star rating + text), multiple-choice, fill-in-the-blank, short-answer. Each type has its own scoring prompt template and personalized feedback prompt template.
- Fill-in-the-blank and short-answer questions are scored by LLM (returns integer 0-10). Multiple-choice is auto-graded against standard answers.
- Learning cards have a lifecycle: draft → published (发放). Once published, cards are locked for editing and become visible to enrolled students.
- Student ID (学号) is the unique identifier for deduplication when importing students via Excel across courses.
- Drizzle schema should include a `device_type` field for analytics.

## Key Domain Concepts

| Chinese Term | English | Notes |
|---|---|---|
| 学习卡 | Learning Card | The quiz/assessment unit |
| 课堂 | Classroom Session | A specific class meeting tied to a course |
| 课程 | Course | Has semester, students, classroom sessions |
| 发放 | Publish/Distribute | Makes a learning card available to students |
| 分析 | Static/Demonstration | Show student's answers on the teacher's windows. |
| 批改提示 | Grading/Feedback Prompt | LLM prompt template for personalized feedback |
| 打分提示词 | Scoring Prompt | LLM prompt template for auto-scoring |

## Conventions

- All UI text is in **Chinese (Simplified)**.
- Each question has its own submit button (independent submission).
- Star ratings auto-submit on click; text fields require explicit submit.
- Touch targets on mobile must be large enough for finger interaction.
- Long streaming text must auto-wrap and be scrollable on small screens.
- Git commit after each major feature module is complete.
