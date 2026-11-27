import { sql } from "drizzle-orm";
import {
  bigint, check, foreignKey, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid,
} from "drizzle-orm/pg-core";
import type {
  AuditEventType, PurchaseDecision, PurchaseStatus, TenantRole,
} from "../../modules/procurement/domain/procurement";

export const tenants = pgTable("tenants", {
  id: uuid().primaryKey(),
  name: text().notNull(),
});

export const users = pgTable("users", {
  id: uuid().primaryKey(),
  displayName: text("display_name").notNull(),
});

export const memberships = pgTable("memberships", {
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: text().$type<TenantRole>().notNull(),
  approvalLimitMinor: bigint("approval_limit_minor", { mode: "number" }),
  labIdentity: text("lab_identity").unique(),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.userId] }),
  check("memberships_role_check", sql`${table.role} in ('REQUESTER', 'APPROVER', 'AUDITOR')`),
  check(
    "memberships_approval_limit_check",
    sql`${table.approvalLimitMinor} is null or ${table.approvalLimitMinor} between 1 and 9007199254740991`,
  ),
]);

export const labSessions = pgTable("lab_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  foreignKey({
    name: "lab_sessions_membership_fk",
    columns: [table.tenantId, table.userId],
    foreignColumns: [memberships.tenantId, memberships.userId],
  }).onDelete("cascade"),
]);

export const costCenters = pgTable("cost_centers", {
  id: uuid().primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  code: text().notNull(),
  name: text().notNull(),
  currency: text().$type<"USD">().notNull().default("USD"),
  allocatedBudgetMinor: bigint("allocated_budget_minor", { mode: "number" }).notNull(),
  committedBudgetMinor: bigint("committed_budget_minor", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("cost_centers_tenant_id_unique").on(table.tenantId, table.id),
  unique("cost_centers_tenant_code_unique").on(table.tenantId, table.code),
  index("cost_centers_tenant_code_idx").on(table.tenantId, table.code),
  check("cost_centers_currency_check", sql`${table.currency} = 'USD'`),
  check("cost_centers_allocated_check", sql`${table.allocatedBudgetMinor} between 0 and 9007199254740991`),
  check(
    "cost_centers_budget_bounds_check",
    sql`${table.committedBudgetMinor} >= 0 and ${table.committedBudgetMinor} <= ${table.allocatedBudgetMinor}`,
  ),
]);

export const purchaseRequests = pgTable("purchase_requests", {
  id: uuid().primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  costCenterId: uuid("cost_center_id").notNull(),
  requesterId: uuid("requester_id").notNull(),
  title: text().notNull(),
  justification: text().notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  currency: text().$type<"USD">().notNull(),
  status: text().$type<PurchaseStatus>().notNull().default("PENDING"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("purchase_requests_tenant_id_unique").on(table.tenantId, table.id),
  unique("purchase_requests_tenant_key_unique").on(table.tenantId, table.idempotencyKey),
  index("purchase_requests_tenant_created_idx").on(table.tenantId, table.createdAt),
  index("purchase_requests_requester_created_idx").on(table.tenantId, table.requesterId, table.createdAt),
  index("purchase_requests_cost_center_idx").on(table.tenantId, table.costCenterId),
  foreignKey({
    name: "purchase_requests_cost_center_fk",
    columns: [table.tenantId, table.costCenterId],
    foreignColumns: [costCenters.tenantId, costCenters.id],
  }),
  foreignKey({
    name: "purchase_requests_requester_membership_fk",
    columns: [table.tenantId, table.requesterId],
    foreignColumns: [memberships.tenantId, memberships.userId],
  }),
  check("purchase_requests_amount_check", sql`${table.amountMinor} between 1 and 9007199254740991`),
  check("purchase_requests_currency_check", sql`${table.currency} = 'USD'`),
  check("purchase_requests_status_check", sql`${table.status} in ('PENDING', 'APPROVED', 'REJECTED')`),
]);

export const financialCommitments = pgTable("financial_commitments", {
  id: uuid().primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  costCenterId: uuid("cost_center_id").notNull(),
  requestId: uuid("request_id").notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  currency: text().$type<"USD">().notNull().default("USD"),
  committedByActorId: uuid("committed_by_actor_id").notNull(),
  committedAt: timestamp("committed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("financial_commitments_tenant_request_unique").on(table.tenantId, table.requestId),
  index("financial_commitments_cost_center_idx").on(table.tenantId, table.costCenterId),
  foreignKey({
    name: "financial_commitments_cost_center_fk",
    columns: [table.tenantId, table.costCenterId],
    foreignColumns: [costCenters.tenantId, costCenters.id],
  }),
  foreignKey({
    name: "financial_commitments_request_fk",
    columns: [table.tenantId, table.requestId],
    foreignColumns: [purchaseRequests.tenantId, purchaseRequests.id],
  }),
  foreignKey({
    name: "financial_commitments_actor_membership_fk",
    columns: [table.tenantId, table.committedByActorId],
    foreignColumns: [memberships.tenantId, memberships.userId],
  }),
  check("financial_commitments_amount_check", sql`${table.amountMinor} between 1 and 9007199254740991`),
  check("financial_commitments_currency_check", sql`${table.currency} = 'USD'`),
]);

export const decisionIdempotencyKeys = pgTable("decision_idempotency_keys", {
  tenantId: uuid("tenant_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  actorId: uuid("actor_id").notNull(),
  requestId: uuid("request_id").notNull(),
  decision: text().$type<PurchaseDecision["decision"]>().notNull(),
  reason: text(),
  requestHash: text("request_hash").notNull(),
  responseStatus: integer("response_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ name: "decision_idempotency_keys_pk", columns: [table.tenantId, table.idempotencyKey] }),
  foreignKey({
    name: "decision_idempotency_keys_actor_fk",
    columns: [table.tenantId, table.actorId],
    foreignColumns: [memberships.tenantId, memberships.userId],
  }),
  foreignKey({
    name: "decision_idempotency_keys_request_fk",
    columns: [table.tenantId, table.requestId],
    foreignColumns: [purchaseRequests.tenantId, purchaseRequests.id],
  }),
  check("decision_idempotency_keys_decision_check", sql`${table.decision} in ('APPROVE', 'REJECT')`),
]);

export const auditEvents = pgTable("audit_events", {
  id: uuid().primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  requestId: uuid("request_id").notNull(),
  actorId: uuid("actor_id").notNull(),
  type: text("event_type").$type<AuditEventType>().notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  reason: text(),
}, (table) => [
  index("audit_events_request_time_idx").on(table.tenantId, table.requestId, table.occurredAt),
  foreignKey({
    name: "audit_events_request_fk",
    columns: [table.tenantId, table.requestId],
    foreignColumns: [purchaseRequests.tenantId, purchaseRequests.id],
  }),
  foreignKey({
    name: "audit_events_actor_membership_fk",
    columns: [table.tenantId, table.actorId],
    foreignColumns: [memberships.tenantId, memberships.userId],
  }),
  check("audit_events_type_check", sql`${table.type} in ('CREATED', 'APPROVED', 'REJECTED')`),
]);
