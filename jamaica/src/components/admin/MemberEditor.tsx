"use client";
import { useState, useTransition } from "react";
import { setActive, setPermissions } from "@/app/actions/admin";

type Member = { id: string; name: string; email: string; role: "staff" | "manager" | "owner"; permissions: string[]; active: boolean };

export function MemberEditor({ member, isMe, canOwner, permissions }: { member: Member; isMe: boolean; canOwner: boolean; permissions: [string, string][] }) {
  const [role, setRole] = useState(member.role);
  const [perms, setPerms] = useState<string[]>(member.permissions);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const locked = isMe || (member.role === "owner" && !canOwner);
  const dirty = role !== member.role || [...perms].sort().join() !== [...member.permissions].sort().join();
  const act = (fn: () => Promise<void>, done: string) =>
    start(async () => {
      try {
        await fn();
        setMsg(done);
      } catch (e) {
        setMsg((e as Error).message);
      }
    });

  return (
    <div className={member.active ? "" : "opacity-60"}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-semibold">{member.name}{isMe && <span className="font-normal text-muted"> (you)</span>}</p>
        <p className="text-small text-muted">{member.email}</p>
        {!member.active && <span className="status status-archived">Deactivated</span>}
        <label className="ml-auto">
          <span className="sr-only">Role</span>
          <select value={role} disabled={locked} onChange={(e) => setRole(e.target.value as Member["role"])} className="field min-h-10 w-auto bg-white py-1.5">
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            {(canOwner || member.role === "owner") && <option value="owner">Owner</option>}
          </select>
        </label>
      </div>
      {role !== "owner" ? (
        <fieldset className="mt-3" disabled={locked}>
          <legend className="sr-only">What {member.name} can open</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {permissions.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-small">
                <input type="checkbox" checked={perms.includes(k)} onChange={(e) => setPerms(e.target.checked ? [...perms, k] : perms.filter((p) => p !== k))} className="h-4 w-4 accent-emerald" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="mt-3 text-small text-muted">Owners can open everything.</p>
      )}
      {!locked && (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button type="button" className="btn btn-dark min-h-10 px-4" disabled={!dirty || pending} onClick={() => act(() => setPermissions(member.id, role, perms), "Access updated.")}>Save access</button>
          <button type="button" className="text-small font-semibold text-danger hover:underline" disabled={pending}
            onClick={() => (member.active ? confirm(`Deactivate ${member.name}? They’ll be signed out at once.`) : true) && act(() => setActive(member.id, !member.active), member.active ? "Deactivated and signed out." : "Reactivated.")}>
            {member.active ? "Deactivate" : "Reactivate"}
          </button>
          {msg && <p className="text-small" aria-live="polite">{msg}</p>}
        </div>
      )}
    </div>
  );
}
