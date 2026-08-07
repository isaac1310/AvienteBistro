import Link from 'next/link';
import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
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
        <main className={`shell ${styles.main}`}>
          <BackLink href="/" label="Home" />
          <p className="eyebrow">Add</p>
          <h1 className={styles.h1}>A new recipe</h1>

          <div className={styles.choices}>
            <Link href="/add?mode=blank" className={`card ${styles.choice}`}>
              <span className={styles.emoji} aria-hidden="true">✍️</span>
              <span className={styles.choiceName}>Type it out</span>
              <span className={styles.choiceBody}>
                A blank form — name, ingredients, steps. Best when you are looking
                at a written recipe or know it by heart.
              </span>
            </Link>

            <Link href="/import" className={`card ${styles.choice}`}>
              <span className={styles.emoji} aria-hidden="true">📋</span>
              <span className={styles.choiceName}>Paste from an AI</span>
              <span className={styles.choiceBody}>
                Photograph the recipe in ChatGPT or Claude, ask for JSON, paste the
                answer here. Handles Hebrew amounts, ranges and notes.
              </span>
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
