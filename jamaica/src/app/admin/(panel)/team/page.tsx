import { requireStaff, PERMISSIONS } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ActionForm } from "@/components/admin/ActionForm";
import { MemberEditor } from "@/components/admin/MemberEditor";
import { inviteEmployee } from "@/app/actions/admin";

export const metadata = { title: "Team" };

export default async function Team() {
  const me = await requireStaff("team");
  const members = await sql<{ id: string; name: string; email: string; role: "staff" | "manager" | "owner"; permissions: string[]; active: boolean; created_at: Date }[]>`
    select id, name, email, role, permissions, active, created_at from users where role <> 'customer' order by active desc, role, name`;
  return (
    <div className="admin-page max-w-[1100px]">
      <h1 className="admin-title">Team</h1>
      <p className="mt-2 max-w-[70ch] text-muted">Everyone who can sign in to this dashboard. Owners can do everything; for staff and managers, tick what each person may open.</p>
      <section aria-labelledby="add-title" className="panel mt-8">
        <h2 id="add-title" className="text-[1.25rem]">Add an employee</h2>
        <ActionForm action={inviteEmployee} submit="Create account" resetOnSuccess keepMessage className="mt-4 grid gap-4 sm:grid-cols-3">
          <label><span className="label">Name</span><input name="name" required className="field bg-white" /></label>
          <label><span className="label">Work email</span><input name="email" type="email" required className="field bg-white" /></label>
          <label>
            <span className="label">Role</span>
            <select name="role" className="field bg-white" defaultValue="staff">
              <option value="staff">Staff: products and orders</option>
              <option value="manager">Manager: also customers, codes, reports</option>
              {me.role === "owner" && <option value="owner">Owner: everything</option>}
            </select>
          </label>
        </ActionForm>
      </section>
      <ul className="mt-10 flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id} className="bg-stone px-4 py-4">
            <MemberEditor member={m} isMe={m.id === me.id} canOwner={me.role === "owner"} permissions={Object.entries(PERMISSIONS)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
