import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNotNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { isLabEnabled } from "../db/lab-config.mjs";
import { getLabDatabase } from "../db/lab-database";
import { labSessions, memberships, tenants, users } from "../db/schema";

const cookieName = "procurement_lab_session";
const sessionLifetime = 8 * 60 * 60;
const tokenFormat = /^[A-Za-z0-9_-]{43}$/;

const identityColumns = {
  key: memberships.labIdentity,
  role: memberships.role,
  displayName: users.displayName,
  tenantName: tenants.name,
};

export async function listLabIdentities() {
  return getLabDatabase().select(identityColumns).from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
    .where(isNotNull(memberships.labIdentity))
    .orderBy(tenants.name, users.displayName);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashFromCookie(jar: Awaited<ReturnType<typeof cookies>>) {
  const token = jar.get(cookieName)?.value;
  return token && tokenFormat.test(token) ? tokenHash(token) : undefined;
}

export async function readLabSession() {
  if (!isLabEnabled()) return undefined;
  const hash = hashFromCookie(await cookies());
  if (!hash) return undefined;

  const [session] = await getLabDatabase().select({
    ...identityColumns,
    tenantId: memberships.tenantId,
    userId: memberships.userId,
  }).from(labSessions)
    .innerJoin(memberships, and(
      eq(memberships.tenantId, labSessions.tenantId),
      eq(memberships.userId, labSessions.userId),
    ))
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
    .where(and(
      eq(labSessions.tokenHash, hash),
      gt(labSessions.expiresAt, new Date()),
      isNotNull(memberships.labIdentity),
    )).limit(1);

  return session;
}

export async function switchLabIdentity(identity: string, secure: boolean) {
  const jar = await cookies();
  const previousHash = hashFromCookie(jar);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetime * 1_000);

  const selected = await getLabDatabase().transaction(async (transaction) => {
    const [membership] = await transaction.select({
      tenantId: memberships.tenantId,
      userId: memberships.userId,
    }).from(memberships).where(eq(memberships.labIdentity, identity)).limit(1);
    if (!membership) return false;

    await transaction.insert(labSessions).values({ ...membership, tokenHash: tokenHash(token), expiresAt });
    if (previousHash) await transaction.delete(labSessions).where(eq(labSessions.tokenHash, previousHash));
    return true;
  });

  if (!selected) return false;
  jar.set(cookieName, token, { httpOnly: true, sameSite: "strict", path: "/", maxAge: sessionLifetime, secure });
  return true;
}
