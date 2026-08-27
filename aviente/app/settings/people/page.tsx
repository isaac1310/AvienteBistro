import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
import { serverT } from '@/lib/lang';
import PeopleManager from '@/components/PeopleManager';
import { supabaseServer, currentMember } from '@/lib/supabase/server';
import type { MemberRow } from '@/lib/memberMutations';
import styles from '../settings.module.css';

export const metadata = { title: 'Aviente — People', robots: { index: false } };

/* Who is in the family, managed where the family lives — not in the Supabase
 * dashboard. Adding a person here is the whole ceremony since migration 0019: the
 * before-user-created hook lets their email through, the trigger links the account,
 * and their first magic link signs them in. Admin-only, gated the way /settings/
 * restore is: server-side, because a hidden URL is a curtain, not a gate. */
export default async function PeoplePage() {
  const t = await serverT();
  const member = await currentMember();

  if (member?.role !== 'admin') {
    return (
      <>
        <Nav current="/" />
        <div className={styles.frame}>
          <main className={`shell ${styles.main}`}>
            <BackLink href="/settings" label={t('settings.eyebrow')} />
            <p className="eyebrow">{t('people.eyebrow')}</p>
            <h1 className={styles.h1}>{t('people.notYours')}</h1>
            <p className={styles.body}>{t('people.notYoursBody')}</p>
          </main>
        </div>
      </>
    );
  }

  const db = await supabaseServer();
  const { data } = await db
    .from('family_members')
    .select('id, name, display_name, email, user_id, role')
    .order('created_at', { ascending: true });

  return (
    <>
      <Nav current="/" />
      <div className={styles.frame}>
        <main className={`shell ${styles.main}`}>
          <BackLink href="/settings" label={t('settings.eyebrow')} />
          <p className="eyebrow">{t('people.eyebrow')}</p>
          <h1 className={styles.h1}>{t('people.title')}</h1>
          <PeopleManager members={(data ?? []) as MemberRow[]} selfId={member.id} />
        </main>
      </div>
    </>
  );
}
