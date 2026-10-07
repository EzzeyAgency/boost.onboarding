import { index, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

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
