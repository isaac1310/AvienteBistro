'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BusyButton from './BusyButton';
import { useT } from './LangProvider';
import { addMember, updateMember, revokeAccess, deleteMember, type MemberRow } from '@/lib/memberMutations';
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
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* One status word per person, derived — the row IS the state. */
  const status = (m: MemberRow) =>
    m.user_id ? t('people.signedUp') : m.email ? t('people.invited') : t('people.creditOnly');

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null);
    try {
      await fn();
      setOpenId(null); setAdding(false); setDraft(EMPTY);
      router.refresh();
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
        {members.map((m) => (
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
                  {/* Delete asks first, then lets the server refuse anyone with
                      recipes, revisions or kids' meals to their name — that refusal
                      message is the real guard; this confirm only slows the tap. */}
                  {m.id !== selfId && (
                    <BusyButton className={styles.danger} busy={busy} type="button"
                      onClick={() => {
                        if (window.confirm(t('people.deleteConfirm', { name: m.name }))) {
                          run(() => deleteMember(m.id));
                        }
                      }}>
                      {t('people.delete')}
                    </BusyButton>
                  )}
                </div>
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
