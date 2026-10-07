CREATE TYPE "public"."form_status" AS ENUM('complete', 'ready_for_fulfillment', 'support_needed', 'customer_action_pending');--> statement-breakpoint
CREATE TYPE "public"."submission_type" AS ENUM('onboarding', 'support');--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_type" "submission_type" NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120),
	"email" varchar(320) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"business_role" varchar(160),
	"form_status" "form_status" DEFAULT 'complete' NOT NULL,
	"google_profile_status" varchar(80),
	"google_access_status" varchar(80),
	"support_topic" varchar(160),
	"message" text,
	"answers" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "submission_type_idx" ON "submissions" USING btree ("submission_type");--> statement-breakpoint
CREATE INDEX "submission_submitted_at_idx" ON "submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "submission_email_idx" ON "submissions" USING btree ("email");