'use client';

import { useState } from 'react';
import BusyButton from './BusyButton';
import { useT } from './LangProvider';
import Confirm from './Confirm';
import {
  addMember, updateMember, revokeAccess, deleteMember, listMembers, type MemberRow,
} from '@/lib/memberMutations';
import styles from './PeopleManager.module.css';

/* The list, then the form. Each person is a row you can open to edit — no separate
 * edit screen, because the whole table is six people. The one deliberately absent
 * button is DELETE: a person may lose their login (revoke), never their existence —
 * their name is on recipes. That asymmetry is the same one the data has: user_id
 * and email are nullable, the row is not.
 */

type Draft = { name: string; display_name: string; email: string; role: 'admin' | 'member' };
const EMPTY: Draft = { name: '', display_name: '', email: '', role: 'member' };

export default function PeopleManager({ members, selfId }: { members: MemberRow[]; selfId: string }) {
  const t = useT();
  /* The server's copy is the first render; every change replaces it with what the
     server says afterwards. Held in state rather than read from the prop because
     revalidatePath + router.refresh() did not re-render this list — the row was
     written and the screen kept showing the old one, so a delete looked like a
     no-op. See listMembers() in lib/memberMutations.ts. */
  const [rows, setRows] = useState<MemberRow[]>(members);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Which row is asking "really?". An in-page step, not window.confirm: a native
     dialog is suppressed outright in embedded browsers — it returned false and the
     delete silently did nothing — and cannot be driven by the regression agent. */
  const [confirmId, setConfirmId] = useState<string | null>(null);

  /* One status word per person, derived — the row IS the state. */
  const status = (m: MemberRow) =>
    m.user_id ? t('people.signedUp') : m.email ? t('people.invited') : t('people.creditOnly');

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null);
    try {
      await fn();
      setRows(await listMembers());
      setOpenId(null); setAdding(false); setConfirmId(null); setDraft(EMPTY);
      /* NO router.refresh() here, and that is the whole fix.
         It re-rendered this component from Next's cached RSC payload — which is
         the stale one — immediately after the fresh list had been set, so the
         screen went back to showing the person who had just been deleted. The
         delete had worked every time; only the view lied. Pages that name a
         person elsewhere (the recipe form's attribution select) are Server
         Components fetched on navigation, and the actions call revalidatePath,
         so they are correct on next visit without this. */
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const fields = (
    <>
      <label className={styles.label}>
        <span>{t('people.name')}</span>
        <input className={styles.input} value={draft.name} lang="he"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </label>
      <label className={styles.label}>
        <span>{t('people.alias')}</span>
        <input className={styles.input} value={draft.display_name} lang="he"
          placeholder={t('people.aliasHint')}
          onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
      </label>
      <label className={styles.label}>
        <span>{t('people.email')}</span>
        <input className={styles.input} type="email" value={draft.email}
          placeholder={t('people.emailHint')} autoComplete="off"
          onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
      </label>
      <label className={styles.label}>
        <span>{t('people.role')}</span>
        <select className={styles.input} value={draft.role}
          onChange={(e) => setDraft({ ...draft, role: e.target.value as Draft['role'] })}>
          <option value="member">{t('people.member')}</option>
          <option value="admin">{t('people.admin')}</option>
        </select>
      </label>
    </>
  );

  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {rows.map((m) => (
          <li key={m.id} className={styles.row}>
            <button type="button" className={styles.head}
              onClick={() => {
                if (openId === m.id) { setOpenId(null); return; }
                setAdding(false); setError(null); setOpenId(m.id);
                setDraft({
                  name: m.name, display_name: m.display_name ?? '',
                  email: m.email ?? '', role: m.role,
                });
              }}>
              <span className={styles.who} lang="he">
                {m.name}
                {m.display_name && <span className={styles.alias} lang="he"> · {m.display_name}</span>}
              </span>
              <span className={styles.status}>
                {m.role === 'admin' && <span className={styles.badge}>{t('people.admin')}</span>}
                {status(m)}
                {/* Nothing on the row looked clickable — no chevron, no hover cue —
                    though each one opens an editor. Rotates when open, so the row
                    also says which state it is in. */}
                <span aria-hidden="true"
                  className={`${styles.chev} ${openId === m.id ? styles.chevOpen : ''}`}>
                  ⌄
                </span>
              </span>
            </button>

            {openId === m.id && (
              <div className={styles.editor}>
                {fields}
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.btnRow}>
                  <BusyButton className="btn" busy={busy} type="button"
                    onClick={() => run(() => updateMember(m.id, {
                      name: draft.name, display_name: draft.display_name,
                      email: draft.email, role: draft.role,
                    }))}>
                    {t('people.save')}
                  </BusyButton>
                  {/* Revoke closes both doors — the session and the email that could
                      reopen it. Absent on yourself: the last admin locking the family
                      out of People is precisely the mistap this page must not allow. */}
                  {m.id !== selfId && (m.user_id || m.email) && (
                    <BusyButton className="btn btn--ghost" busy={busy} type="button"
                      onClick={() => run(() => revokeAccess(m.id))}>
                      {t('people.revoke')}
                    </BusyButton>
                  )}
                  {/* Two taps, in the page. The server still refuses anyone with
                      recipes, revisions or kids' meals to their name — that refusal
                      is the real guard; this step only slows the tap down. */}
                  {/* Stays rendered AND enabled while its panel is open. Confirm gives
                      focus back to whatever opened it, and neither an unmounted trigger
                      nor a disabled one can take focus — both left a keyboard user in
                      the navigation. Re-opening the panel that is already open costs
                      nothing: it sets the same state. */}
                  {m.id !== selfId && (
                    <button type="button" className={styles.danger}
                      disabled={busy}
                      onClick={() => { setError(null); setConfirmId(m.id); }}>
                      {t('people.delete')}
                    </button>
                  )}
                </div>

                {/* The shared panel, not a second copy of it. This screen grew its
                    own inline confirm first and Confirm.tsx arrived after, so the
                    focus and Escape handling added there would have had to be written
                    twice — which is the drift a shared component exists to stop. */}
                {confirmId === m.id && (
                  <>
                    <Confirm
                      message={t('people.deleteConfirm', { name: m.name })}
                      confirmLabel={t('common.confirmDelete')}
                      busy={busy}
                      onConfirm={() => run(() => deleteMember(m.id))}
                      onCancel={() => setConfirmId(null)}
                    />
                    {/* The gentler answer, offered where the question is asked. The
                        copy used to recommend "Remove access" while that control was
                        out of sight above the panel, so the advice could not be
                        followed from where it was given. */}
                    {(m.user_id || m.email) && (
                      <button type="button" className={styles.orRevoke} disabled={busy}
                        onClick={() => run(() => revokeAccess(m.id))}>
                        {t('people.orRevoke')}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <div className={`card ${styles.addCard}`}>
          <h2 className={styles.h2}>{t('people.addTitle')}</h2>
          <p className={styles.hint}>{t('people.addBody')}</p>
          {fields}
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.btnRow}>
            <BusyButton className="btn" busy={busy} type="button"
              onClick={() => run(() => addMember({
                name: draft.name, display_name: draft.display_name,
                email: draft.email, role: draft.role,
              }))}>
              {t('people.add')}
            </BusyButton>
            <button type="button" className="btn btn--ghost"
              onClick={() => { setAdding(false); setError(null); }}>
              {t('people.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.addOffer}
          onClick={() => { setOpenId(null); setError(null); setDraft(EMPTY); setAdding(true); }}>
          {t('people.addOffer')}
        </button>
      )}
    </div>
  );
}
