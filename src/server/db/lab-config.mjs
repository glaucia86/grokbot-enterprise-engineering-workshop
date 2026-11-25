export function isLabEnabled() {
  return process.env.WORKSHOP_LAB_MODE === "enabled";
}

export function labConnectionString() {
  const connectionString = process.env.WORKSHOP_DATABASE_URL;
  if (!connectionString) {
    throw new Error("The lab database connection is missing.");
  }

  const target = new URL(connectionString);
  if (
    target.protocol !== "postgresql:" ||
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    target.pathname !== "/procurement_hub_lab" ||
    target.search ||
    target.hash
  ) {
    throw new Error("Use a loopback connection to the disposable lab database.");
  }
  return connectionString;
}
