CREATE TABLE "group_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"rater_id" uuid NOT NULL,
	"target_student_id" uuid NOT NULL,
	"stars" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_ratings_question_id_rater_id_target_student_id_unique" UNIQUE("question_id","rater_id","target_student_id")
);
--> statement-breakpoint
ALTER TABLE "group_ratings" ADD CONSTRAINT "group_ratings_question_id_card_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."card_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_ratings" ADD CONSTRAINT "group_ratings_rater_id_students_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_ratings" ADD CONSTRAINT "group_ratings_target_student_id_students_id_fk" FOREIGN KEY ("target_student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;