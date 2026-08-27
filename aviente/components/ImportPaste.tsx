'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { importRecipes, undoImport, type ImportedRow, type ImportResult, type OnDuplicate } from '@/lib/importMutations';
import { toRecipeInput, type ParsedRecipe } from '@/lib/toRecipeInput';
import { normalizeDocument, parsePastedJson } from '@/lib/recipeParse.mjs';
import { categoryLabel, CATEGORIES } from '@/lib/constants';
import type { RecipeInput } from '@/lib/mutations';
import { useT } from './LangProvider';
import Link from 'next/link';
import Motif from './Motif';
import styles from './ImportPaste.module.css';
import Arrow from './Arrow';
import BusyButton from './BusyButton';

/** Where an imported recipe now lives. The category is in the path, which is why the
 *  import result had to start returning it. */
const rowHref = (r: ImportedRow) => `/recipes/${r.category}/${r.id}`;


/* §3.9 — paste what an AI made of a photograph.
 *
 * The shape is Vault-Mart's, which works: a read-only prompt you copy out, a box
 * you paste into, tolerant parsing, and a live preview before anything is
 * written. Nothing is saved until IMPORT is pressed.
 */

const PROMPT = `קרא את המתכון — מתמונה, מקובץ, או מהטקסט שאני מדביק כאן — והחזר JSON בלבד, בלי טקסט נוסף, במבנה הזה:

{"schemaVersion":1,"title":"שם המתכון","titleEn":"Latin name or null",
 "category":"mains|soups|salads|entrees|sides|breads|desserts|kids|other",
 "servings":6,"yieldText":null,"prepMinutes":20,"cookMinutes":40,
 "descriptionHe":"תיאור קצר לתפריט","story":null,
 "servingSuggestions":"איך להגיש",
 "ingredients":[{"name":"קמח","amount":500,"unit":"g","note":null,"group":null},
                {"name":"טחינה","amount":3,"unit":"tbsp","note":null,"group":"לרוטב"}],
 "steps":[{"heading":null,"body":"..."}]}

unit חייב להיות אחד מ: g, kg, ml, l, cup, tbsp, tsp, pcs, pinch, to taste.
group הוא החלק שהמרכיב שייך אליו — "לרוטב", "למילוי", "לקציצות". אם המתכון מחולק לחלקים, סמן כל מרכיב בחלק שלו; אם לא, השאר null בכולם. מרכיבים של אותו חלק חייבים להופיע רצוף.
לטווח כמויות השתמש ב-amount ו-amountMax. אם אין כמות, השמט את amount.
אפשר להחזיר מערך של כמה מתכונים.`;

export default function ImportPaste({
  members,
}: { members: { id: string; name: string }[] }) {
  const t = useT();
  const router = useRouter();
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  /* Titles corrected on the preview card. Keyed by index like the category
     overrides, and empty until something is actually edited — so an untouched
     preview passes the parsed title through rather than a copy of it. */
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [source, setSource] = useState('');
  const [onDuplicate, setOnDuplicate] = useState<OnDuplicate>('skip');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  /* Parsed live as you type, so mistakes show before anything is written. */
  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    const got = parsePastedJson(text);
    if (got.error) return { error: got.error, recipes: [] as never[], errors: [] as string[] };
    return { error: null as string | null, ...normalizeDocument(got.data) };
  }, [text]);

  /* Match a name carried in the payload to a family member. Unknown names fall
     through to the batch choice rather than being invented. */
  const memberIdFor = (name?: string | null) => {
    if (!name) return null;
    const hit = members.find((m) => m.name.trim() === String(name).trim());
    return hit?.id ?? null;
  };

  async function onImport() {
    if (!parsed?.recipes.length) return;
    setBusy(true);
    try {
      /* Mapped through lib/toRecipeInput, shared with the restore door. It was
         inlined here, and the restore path grew its own copy for one commit — which
         is exactly how a field ends up named in one path and dropped in the other.
         Backups have already lost ingredient groups and photos that way. */
      const inputs: RecipeInput[] = (parsed.recipes as ParsedRecipe[]).map((r, i) =>
        toRecipeInput(r, {
          category: overrides[i] ?? r.category,
          title: titles[i],
          sourceMemberId: memberIdFor(r.source) ?? (source || null),
        }));
      setResult(await importRecipes(inputs, { onDuplicate }));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.h1}>{t('import.done')}</h1>
        <p className={styles.summary}>
          {result.imported.length} added
          {result.replaced.length > 0 && ` · ${result.replaced.length} replaced`}
          {result.skipped.length > 0 && ` · ${result.skipped.length} skipped`}
          {result.failed.length > 0 && ` · ${result.failed.length} failed`}
        </p>

        {/* A single recipe gets a real button. That is the commonest import by far —
            one photograph, one dish — and the report used to end with the recipe
            named as plain text and no way to open it. */}
        {result.imported.length + result.replaced.length === 1 && (
          <Link href={rowHref([...result.imported, ...result.replaced][0])} className="btn">
            {t('import.goToRecipe')} <Arrow dir="forward" />
          </Link>
        )}

        {result.imported.length > 0 && (
          <ul className={styles.report}>
            {result.imported.map((r) => (
              <li key={r.id}>
                <span className={styles.ok}>added</span>{' '}
                <Link href={rowHref(r)} className={styles.rowLink} lang="he">{r.title}</Link>
              </li>
            ))}
          </ul>
        )}
        {/* Skips and failures are listed individually. A count alone hides which
            recipe did not make it, which is the only thing worth knowing. */}
        {result.replaced.map((r) => (
          <p key={r.id} className={styles.line}>
            <span className={styles.skip}>replaced</span>{' '}
            <Link href={rowHref(r)} className={styles.rowLink} lang="he">{r.title}</Link>
          </p>
        ))}
        {result.skipped.map((r) => (
          <p key={r.title} className={styles.line}>
            <span className={styles.skip}>skipped</span> <span lang="he">{r.title}</span> — {r.why}
          </p>
        ))}
        {result.failed.map((r) => (
          <p key={r.title} className={styles.line}>
            <span className={styles.fail}>failed</span> <span lang="he">{r.title}</span> — {r.why}
          </p>
        ))}

        <div className={styles.actions}>
          <button className="btn" onClick={() => { setResult(null); setText(''); }}>
            {t('import.more')}
          </button>
          {/* Undo showed NOTHING while it ran — not a label change, not a spinner,
              just a disabled button while it deleted twenty recipes. */}
          <BusyButton busy={busy} className="btn btn--ghost" busyLabel={t('import.undoing')}
            onClick={async () => {
              setBusy(true);
              await undoImport(result.imported.map((r) => r.id));
              setResult(null); setText(''); setBusy(false); router.refresh();
            }}>
            {result.replaced.length > 0
              ? t('import.undoNew', { n: result.imported.length })
              : t('import.undoAll')}
          </BusyButton>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className="eyebrow">{t('import.eyebrow')}</p>
      <h1 className={styles.h1}>{t('add.paste')}</h1>

      <section className={styles.step}>
        <h2 className={styles.h2}>{t('import.step1')}</h2>
        <p className={styles.hint}>{t('import.howto')}</p>
        <textarea className={styles.prompt} readOnly rows={6} value={PROMPT} />
        <button type="button" className={styles.copy}
          onClick={async () => { await navigator.clipboard.writeText(PROMPT); setCopied(true); }}>
          {copied ? t('import.copied') : t('import.copyPrompt')}
        </button>
      </section>

      <section className={styles.step}>
        <h2 className={styles.h2}>{t('import.step2')}</h2>

        {/* A file picker, because asking someone to run `cat … | pbcopy` to move a
            file three inches is absurd. It also means a backup from /api/backup
            can be restored by choosing it — the export and the import finally
            speak the same format in both directions. */}
        <div className={styles.fileRow}>
          <button type="button" className={styles.copy} onClick={() => file.current?.click()}>
            <><Motif name="folder" size={18} /> {t('import.chooseFile')}</>
          </button>
          {fileName && <span className={styles.fileName}>{fileName}</span>}
        </div>
        <input
          ref={file} type="file" accept=".json,application/json" hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileName(f.name);
            // Straight into the same box, so what the file contains is visible and
            // editable before anything is written.
            setText(await f.text());
          }}
        />

        <textarea className={styles.paste} rows={8} value={text} lang="he"
          placeholder={'{"schemaVersion":1,"title":"…"}'}
          onChange={(e) => { setText(e.target.value); setFileName(null); }} />
      </section>

      {parsed?.error && <p className={styles.error}>{parsed.error}</p>}
      {parsed && !parsed.error && parsed.errors.length > 0 &&
        parsed.errors.map((e: string) => <p key={e} className={styles.error}>{e}</p>)}

      {parsed && !parsed.error && parsed.recipes.length > 0 && (
        <section className={styles.step}>
          <h2 className={styles.h2}>{t('import.step3')}</h2>

          {/* What to do about a recipe already in the book. Skip is the default
              because it is the only one that cannot lose anything. */}
          <fieldset className={styles.dupes}>
            <legend className={styles.label}>{t('import.onDuplicate')}</legend>
            {([
              ['skip', 'import.dupeSkip', 'import.dupeSkipWhy'],
              ['replace', 'import.dupeReplace', 'import.dupeReplaceWhy'],
              ['add', 'import.dupeAdd', 'import.dupeAddWhy'],
            ] as const).map(([value, name, why]) => (
              <label key={value} className={styles.dupe}>
                <input
                  type="radio" name="ondupe" value={value}
                  checked={onDuplicate === value}
                  onChange={() => setOnDuplicate(value)}
                />
                <span><strong>{t(name)}</strong> — {t(why)}</span>
              </label>
            ))}
          </fieldset>

          <label className={styles.field}>
            <span className={styles.label}>{t('import.whose')}</span>
            <select className={styles.select} value={source}
              onChange={(e) => setSource(e.target.value)}>
              <option value="">—</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>

          <ul className={styles.preview}>
            {parsed.recipes.map((r, i: number) => {
              const cat = overrides[i] ?? r.category;
              /* An unrecognised category lands in `other` and says so, with a
                 dropdown right there — never a silent misfiling. */
              const unsure = r.warnings?.some((w: string) => w.includes('category'));
              return (
                <li key={i} className={`card ${styles.row}`}>
                  <div>
                    {/* Editable, because an AI-generated title is exactly the thing
                        you want to fix BEFORE it becomes a row — afterwards it is an
                        edit to a recipe, and the duplicate check has already run
                        against the wrong name. */}
                    <input
                      className={styles.titleField}
                      lang="he"
                      value={titles[i] ?? r.title}
                      aria-label={t('import.editTitle')}
                      onChange={(e) => setTitles({ ...titles, [i]: e.target.value })}
                    />
                    <p className={styles.meta}>
                      {r.ingredients.length} ingredients · {r.steps.length} steps
                      {r.servings ? ` · serves ${r.servings}` : r.yieldText ? ` · ${r.yieldText}` : ''}
                    </p>
                    {r.warnings?.map((w: string) => (
                      <p key={w} className={styles.warn}>
                        <Motif name="warning" size={15} strokeWidth={2.2}
                          className={styles.warnMark} />
                        {w}
                      </p>
                    ))}
                  </div>
                  <select
                    className={`${styles.select} ${unsure ? styles.unsure : ''}`}
                    value={cat}
                    onChange={(e) => setOverrides({ ...overrides, [i]: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{categoryLabel(c.key).en}</option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>

          <BusyButton busy={busy} onClick={onImport} busyLabel={t('import.importing')}>
            {parsed.recipes.length === 1
              ? t('import.importOne')
              : t('import.importN', { n: parsed.recipes.length })}
          </BusyButton>
        </section>
      )}
    </div>
  );
}
