CREATE TABLE "lesson_plan_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_plan_id" uuid NOT NULL,
	"heading_level" integer NOT NULL,
	"heading_text" varchar(500) NOT NULL,
	"anchor_id" varchar(200) NOT NULL,
	"section_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"file_name" varchar(200) NOT NULL,
	"html_content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_plans_classroom_id_unique" UNIQUE("classroom_id")
);
--> statement-breakpoint
ALTER TABLE "card_questions" ADD COLUMN "matched_section_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_plan_sections" ADD CONSTRAINT "lesson_plan_sections_lesson_plan_id_lesson_plans_id_fk" FOREIGN KEY ("lesson_plan_id") REFERENCES "public"."lesson_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_questions" ADD CONSTRAINT "card_questions_matched_section_id_lesson_plan_sections_id_fk" FOREIGN KEY ("matched_section_id") REFERENCES "public"."lesson_plan_sections"("id") ON DELETE set null ON UPDATE no action;