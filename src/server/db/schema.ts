import { sql } from "drizzle-orm";
import {
  bigint, check, foreignKey, index, pgTable, primaryKey, text, timestamp, unique, uuid,
} from "drizzle-orm/pg-core";
import type {
  AuditEventType, PurchaseStatus, TenantRole,
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
  labIdentity: text("lab_identity").unique(),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.userId] }),
  check("memberships_role_check", sql`${table.role} in ('REQUESTER', 'APPROVER', 'AUDITOR')`),
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

export const purchaseRequests = pgTable("purchase_requests", {
  id: uuid().primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
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
  foreignKey({
    name: "purchase_requests_requester_membership_fk",
    columns: [table.tenantId, table.requesterId],
    foreignColumns: [memberships.tenantId, memberships.userId],
  }),
  check("purchase_requests_amount_check", sql`${table.amountMinor} between 1 and 9007199254740991`),
  check("purchase_requests_currency_check", sql`${table.currency} = 'USD'`),
  check("purchase_requests_status_check", sql`${table.status} in ('PENDING', 'APPROVED', 'REJECTED')`),
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
