'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, currentMember } from './supabase/server';

/* The People page's writes. Server Actions on the ordinary authenticated client —
 * no admin API, no service key: since migration 0019 the access gate is the
 * before-user-created hook reading family_members.email, and family_members is a
 * table RLS already lets a member write. What these actions add over raw table
 * access is the ADMIN rule and readable errors.
 *
 * The admin check is the same shape as restoreBackup's (lib/importMutations.ts):
 * server-side, because a page being hard to find is a curtain, not a gate. It is
 * still policy rather than RLS — is_family() lets any member write this table with
 * the anon key and their own session. Accepted for a household: the threat model is
 * a mistap, not Moran. Stated here so nobody later mistakes the curtain for a wall.
 */

export type MemberRow = {
  id: string;
  name: string;
  display_name: string | null;
  email: string | null;
  user_id: string | null;
  role: 'admin' | 'member';
};

async function requireAdmin() {
  const member = await currentMember();
  if (!member) throw new Error('Not a family member — nothing was changed.');
  if (member.role !== 'admin') throw new Error('Managing people is the admin’s job.');
  return member;
}

/** Lowercased, or null. The doorman compares lowercase; write what it reads. */
const cleanEmail = (email: string | null | undefined): string | null => {
  const e = email?.trim().toLowerCase() ?? '';
  if (!e) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error(`"${e}" does not look like an email address.`);
  return e;
};

/**
 * Add a person. With an email they can sign themselves in (the doorman lets the
 * address through, the trigger links the account); without one they are
 * credit-only, like Savta — a person recipes can be attributed to who never logs in.
 */
export async function addMember(input: {
  name: string; display_name?: string | null; email?: string | null; role?: 'admin' | 'member';
}): Promise<void> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) throw new Error('A person needs a name.');
  const db = await supabaseServer();
  const { error } = await db.from('family_members').insert({
    name,
    display_name: input.display_name?.trim() || null,
    email: cleanEmail(input.email),
    role: input.role === 'admin' ? 'admin' : 'member',
  });
  if (error) throw new Error(friendly(error.message));
  revalidatePath('/settings/people');
}

/** Rename, change the alias, change the email, or change the role. */
export async function updateMember(id: string, input: {
  name?: string; display_name?: string | null; email?: string | null; role?: 'admin' | 'member';
}): Promise<void> {
  await requireAdmin();
  const patch: Record<string, string | null> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error('A person needs a name.');
    patch.name = name;
  }
  if (input.display_name !== undefined) patch.display_name = input.display_name?.trim() || null;
  if (input.email !== undefined) patch.email = cleanEmail(input.email);
  if (input.role !== undefined) patch.role = input.role === 'admin' ? 'admin' : 'member';
  if (!Object.keys(patch).length) return;

  const db = await supabaseServer();
  const { error } = await db.from('family_members').update(patch).eq('id', id);
  if (error) throw new Error(friendly(error.message));
  revalidatePath('/settings/people');
}

/**
 * Take away someone's login and keep the person.
 *
 * Clears user_id AND email in one motion — the row is what confers membership, so
 * nulling user_id locks the account out of everything on the next request; clearing
 * the email closes the self-service door too, or they could simply sign back in and
 * the trigger would relink them. Their name stays on every recipe they are credited
 * on, which is the reason this is not a delete.
 *
 * The orphaned auth account keeps existing in Supabase and grants nothing. The
 * admin may tidy it in the dashboard, or not; docs/ADDING-A-PERSON.md says so.
 */
export async function revokeAccess(id: string): Promise<void> {
  const admin = await requireAdmin();
  if (id === admin.id) throw new Error('You cannot revoke your own access — another admin (or the dashboard) has to do that.');
  const db = await supabaseServer();
  const { error } = await db.from('family_members')
    .update({ user_id: null, email: null })
    .eq('id', id);
  if (error) throw new Error(friendly(error.message));
  revalidatePath('/settings/people');
}

/** Postgres speaks in constraint names; the admin gets told what actually happened. */
function friendly(message: string): string {
  if (message.includes('family_members_email_key'))
    return 'That email already belongs to someone on the list.';
  if (message.includes('family_members_user_id_key'))
    return 'That account is already linked to someone on the list.';
  return message;
}
