CREATE TABLE "client_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"email" varchar(320) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"draft_id" integer,
	"submission_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "client_page_draft_idx" ON "client_pages" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "client_page_submission_idx" ON "client_pages" USING btree ("submission_id");