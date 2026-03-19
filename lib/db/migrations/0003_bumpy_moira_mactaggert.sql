CREATE TABLE "discussion_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"topic" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"participation_max_score" integer DEFAULT 20 NOT NULL,
	"attitude_max_score" integer DEFAULT 20 NOT NULL,
	"ability_max_score" integer DEFAULT 20 NOT NULL,
	"emotion_max_score" integer DEFAULT 20 NOT NULL,
	"innovation_max_score" integer DEFAULT 20 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"participation_score" integer,
	"attitude_score" integer,
	"ability_score" integer,
	"emotion_score" integer,
	"innovation_score" integer,
	"total_score" integer,
	"ai_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_sessions_card_id_student_id_unique" UNIQUE("card_id","student_id")
);
--> statement-breakpoint
ALTER TABLE "discussion_cards" ADD CONSTRAINT "discussion_cards_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_sessions" ADD CONSTRAINT "discussion_sessions_card_id_discussion_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."discussion_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_sessions" ADD CONSTRAINT "discussion_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;