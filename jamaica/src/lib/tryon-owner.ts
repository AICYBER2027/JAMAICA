import "server-only";
import { getUser, visitorKey } from "./auth";

/** Who owns try-on photos and jobs: the account if signed in, otherwise this browser. */
export async function tryonOwner(create: boolean): Promise<{ key: string; userId: string | null } | null> {
  const user = await getUser();
  if (user) return { key: `u:${user.id}`, userId: user.id };
  const v = await visitorKey(create);
  return v ? { key: `v:${v}`, userId: null } : null;
}
