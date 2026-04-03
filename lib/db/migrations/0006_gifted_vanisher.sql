ALTER TABLE "card_questions" ADD COLUMN "matched_lesson_plan_url" varchar(500);--> statement-breakpoint
ALTER TABLE "discussion_cards" ADD COLUMN "min_rounds" integer DEFAULT 3 NOT NULL;