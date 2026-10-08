import { index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const submissionType = pgEnum("submission_type", ["onboarding", "support"]);

export const formStatus = pgEnum("form_status", [
  "complete",
  "ready_for_fulfillment",
  "support_needed",
  "customer_action_pending",
]);

export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    submissionType: submissionType("submission_type").notNull(),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }),
    email: varchar("email", { length: 320 }).notNull(),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    businessRole: varchar("business_role", { length: 160 }),
    formStatus: formStatus("form_status").notNull().default("complete"),
    googleProfileStatus: varchar("google_profile_status", { length: 80 }),
    googleAccessStatus: varchar("google_access_status", { length: 80 }),
    supportTopic: varchar("support_topic", { length: 160 }),
    message: text("message"),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  table => [
    index("submission_type_idx").on(table.submissionType),
    index("submission_submitted_at_idx").on(table.submittedAt),
    index("submission_email_idx").on(table.email),
  ]
);

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;

/** In-progress onboarding saved by the customer. Resumed with a secret link; only its hash is stored. */
export const drafts = pgTable(
  "drafts",
  {
    id: serial("id").primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    email: varchar("email", { length: 320 }).notNull(),
    firstName: varchar("first_name", { length: 120 }),
    lastName: varchar("last_name", { length: 120 }),
    companyName: varchar("company_name", { length: 255 }),
    googleProfileStatus: varchar("google_profile_status", { length: 80 }),
    googleAccessStatus: varchar("google_access_status", { length: 80 }),
    step: integer("step").notNull().default(0),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    submissionId: integer("submission_id"),
  },
  table => [index("draft_updated_at_idx").on(table.updatedAt), index("draft_email_idx").on(table.email)]
);

export type Draft = typeof drafts.$inferSelect;
