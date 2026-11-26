import { isLabEnabled } from "./lab-config";

type BarrierEntry = {
  expected: number;
  arrived: number;
  resolvers: (() => void)[];
  timer: ReturnType<typeof setTimeout>;
};

const activeBarriers = new Map<string, BarrierEntry>();
const barrierPattern = /^([A-Za-z0-9_-]{1,64}):([2-8])$/;

export async function waitForLabSyncBarrier(headerValue: string | undefined): Promise<void> {
  if (!isLabEnabled() || !headerValue) return;
  const match = barrierPattern.exec(headerValue.trim());
  if (!match) return;

  const token = match[1];
  const expected = Number(match[2]);

  await new Promise<void>((resolve) => {
    let entry = activeBarriers.get(token);
    if (!entry) {
      entry = {
        expected,
        arrived: 0,
        resolvers: [],
        timer: setTimeout(() => {
          const stale = activeBarriers.get(token);
          if (!stale) return;
          activeBarriers.delete(token);
          for (const done of stale.resolvers) done();
        }, 3_000),
      };
      activeBarriers.set(token, entry);
    }

    entry.arrived += 1;
    entry.resolvers.push(resolve);
    if (entry.arrived >= entry.expected) {
      clearTimeout(entry.timer);
      activeBarriers.delete(token);
      for (const done of entry.resolvers) done();
    }
  });
}
