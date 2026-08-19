import Link from 'next/link';
import BackLink from '@/components/BackLink';
import Icon from '@/components/Icon';
import Nav from '@/components/Nav';
import PageHeader from '@/components/PageHeader';
import PageTitle from '@/components/PageTitle';
import { serverT } from '@/lib/lang';
import RecipeForm from '@/components/RecipeForm';
import { supabaseServer } from '@/lib/supabase/server';
import styles from './add.module.css';

export const metadata = { title: 'Aviente — Add' };

/* Two ways in, because they suit different moments: typing one out at the table,
 * or pasting what an AI made of a photograph. The chooser is one tap and saves
 * guessing which screen someone wanted. */
export default async function AddPage({
  searchParams,
}: { searchParams: Promise<{ mode?: string }> }) {
  const t = await serverT();
  const { mode } = await searchParams;
  const db = await supabaseServer();
  const { data: members } = await db.from('family_members').select('id, name').order('name');

  if (mode === 'blank') {
    return <RecipeForm recipe={null} members={members ?? []} />;
  }

  return (
    <>
      <Nav current="/add" />
      <div className={styles.frame}>
        {/* Outside main, so the band runs full-bleed. Nested in a shell it would be
            capped at the content width and stop being a band. */}
        <div className={`shell ${styles.backRow}`}>
          <BackLink href="/" label={t('nav.home')} />
        </div>

        <PageHeader>
          <PageTitle eyebrow={t('add.eyebrow')}>{t('add.title')}</PageTitle>
        </PageHeader>

        <main className={`shell ${styles.main}`}>

          <div className={styles.choices}>
            <Link href="/add?mode=blank" className={`card ${styles.choice}`}>
              {/* Drawn, like everything else. These two were the last emoji left in
                  the app after the nav, the plates and the kids' section. */}
              <Icon name="add_recipe" size={34} strokeWidth={1.7} className={styles.emoji} />
              <span className={styles.choiceName}>{t('add.typeIt')}</span>
              <span className={styles.choiceBody}>{t('add.typeItBody')}</span>
            </Link>

            <Link href="/import" className={`card ${styles.choice}`}>
              <Icon name="recipes" size={34} strokeWidth={1.7} className={styles.emoji} />
              <span className={styles.choiceName}>{t('add.paste')}</span>
              <span className={styles.choiceBody}>{t('add.pasteBody')}</span>
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
