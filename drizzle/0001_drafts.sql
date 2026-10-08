CREATE TABLE "drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"email" varchar(320) NOT NULL,
	"first_name" varchar(120),
	"last_name" varchar(120),
	"company_name" varchar(255),
	"google_profile_status" varchar(80),
	"google_access_status" varchar(80),
	"step" integer DEFAULT 0 NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"submission_id" integer,
	CONSTRAINT "drafts_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX "draft_updated_at_idx" ON "drafts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "draft_email_idx" ON "drafts" USING btree ("email");