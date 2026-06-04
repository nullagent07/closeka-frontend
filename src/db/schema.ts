import { relations } from "drizzle-orm";
import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workspaceRoleEnum = pgEnum("workspace_role", ["owner", "member"]);
export const workspacePlanEnum = pgEnum("workspace_plan", ["starter", "growth", "scale", "trial"]);
export const closePeriodStatusEnum = pgEnum("close_period_status", [
  "open",
  "in_progress",
  "blocked",
  "closed",
]);
export const checklistStatusEnum = pgEnum("checklist_status", [
  "pending",
  "requested",
  "received",
  "blocked",
  "done",
]);
export const blockerSeverityEnum = pgEnum("blocker_severity", ["low", "medium", "high"]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "running", "done", "failed"]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 80 }),
  plan: workspacePlanEnum("plan").notNull().default("starter"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clerkUserId: varchar("clerk_user_id", { length: 64 }).notNull(),
    role: workspaceRoleEnum("role").notNull().default("member"),
    email: varchar("email", { length: 254 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("workspace_members_user_idx").on(t.clerkUserId),
    uniqMembership: uniqueIndex("workspace_members_unique").on(t.workspaceId, t.clerkUserId),
  }),
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    primaryContactEmail: varchar("primary_contact_email", { length: 254 }),
    primaryContactName: varchar("primary_contact_name", { length: 200 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ wsIdx: index("clients_ws_idx").on(t.workspaceId) }),
);

export const closePeriods = pgTable(
  "close_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    periodLabel: varchar("period_label", { length: 64 }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    status: closePeriodStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    clientIdx: index("close_periods_client_idx").on(t.clientId),
    uniqPeriod: uniqueIndex("close_periods_unique").on(t.clientId, t.periodLabel),
  }),
);

export const checklistItems = pgTable(
  "checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    closePeriodId: uuid("close_period_id")
      .notNull()
      .references(() => closePeriods.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    status: checklistStatusEnum("status").notNull().default("pending"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    assigneeEmail: varchar("assignee_email", { length: 254 }),
    orderIndex: bigint("order_index", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ periodIdx: index("checklist_items_period_idx").on(t.closePeriodId) }),
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    closePeriodId: uuid("close_period_id").references(() => closePeriods.id, { onDelete: "set null" }),
    uploadedByClerkUserId: varchar("uploaded_by_clerk_user_id", { length: 64 }),
    storagePath: text("storage_path").notNull(),
    filename: varchar("filename", { length: 300 }).notNull(),
    mimeType: varchar("mime_type", { length: 200 }),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    source: varchar("source", { length: 32 }).notNull().default("upload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ clientIdx: index("documents_client_idx").on(t.clientId) }),
);

export const documentExtractions = pgTable("document_extractions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  model: varchar("model", { length: 120 }),
  extractedJson: jsonb("extracted_json").notNull(),
  rawText: text("raw_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const blockers = pgTable(
  "blockers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    closePeriodId: uuid("close_period_id")
      .notNull()
      .references(() => closePeriods.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    detail: text("detail"),
    severity: blockerSeverityEnum("severity").notNull().default("medium"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ periodIdx: index("blockers_period_idx").on(t.closePeriodId) }),
);

export const questionSets = pgTable("question_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  closePeriodId: uuid("close_period_id")
    .notNull()
    .references(() => closePeriods.id, { onDelete: "cascade" }),
  model: varchar("model", { length: 120 }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedByClerkUserId: varchar("approved_by_clerk_user_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionSetId: uuid("question_set_id")
    .notNull()
    .references(() => questionSets.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  orderIndex: bigint("order_index", { mode: "number" }).notNull().default(0),
});

export const emailDrafts = pgTable("email_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  closePeriodId: uuid("close_period_id")
    .notNull()
    .references(() => closePeriods.id, { onDelete: "cascade" }),
  questionSetId: uuid("question_set_id").references(() => questionSets.id, { onDelete: "set null" }),
  subject: varchar("subject", { length: 300 }).notNull(),
  body: text("body").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedByClerkUserId: varchar("approved_by_clerk_user_id", { length: 64 }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  postmarkMessageId: varchar("postmark_message_id", { length: 80 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inboundMessages = pgTable("inbound_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  fromEmail: varchar("from_email", { length: 254 }),
  subject: varchar("subject", { length: 400 }),
  rawPayload: jsonb("raw_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: varchar("kind", { length: 80 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: jobStatusEnum("status").notNull().default("pending"),
    attempts: bigint("attempts", { mode: "number" }).notNull().default(0),
    runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: varchar("locked_by", { length: 80 }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    runIdx: index("jobs_run_idx").on(t.status, t.runAt),
  }),
);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 80 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 80 }),
  priceId: varchar("price_id", { length: 80 }),
  status: varchar("status", { length: 40 }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  actorClerkUserId: varchar("actor_clerk_user_id", { length: 64 }),
  action: varchar("action", { length: 80 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: varchar("entity_id", { length: 80 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  clients: many(clients),
  subscriptions: many(subscriptions),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [clients.workspaceId], references: [workspaces.id] }),
  closePeriods: many(closePeriods),
  documents: many(documents),
}));

export const closePeriodsRelations = relations(closePeriods, ({ one, many }) => ({
  client: one(clients, { fields: [closePeriods.clientId], references: [clients.id] }),
  checklistItems: many(checklistItems),
  blockers: many(blockers),
}));
