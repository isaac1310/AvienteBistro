'use client';

import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import Loading from './Loading';
import { useT } from './LangProvider';
import styles from './PhotoField.module.css';

/* §3.4's photo control.
 *
 * The downscale is the point. A phone photo is 3–12MB; unresized it would exhaust
 * Supabase's 1GB free Storage in about a hundred recipes and crawl on a kitchen
 * connection.
 *
 * 1200px at 0.72, down from 1600 at 0.85. Nothing renders a photo larger than the
 * recipe hero — about 800px at desktop width, 92px in a list — so the extra 400px
 * and the extra quality were bytes nobody could see, paid for by a slower upload on
 * a phone. Roughly a third of the previous size.
 */

const MAX_EDGE = 1200;
const QUALITY = 0.72;

/**
 * A wall clock around a promise that might never settle.
 *
 * This exists because of a real failure: Moran's upload sat on "saving" forever with
 * nothing in the Supabase logs — the signature of work that never reached the
 * network. `createImageBitmap` rejects for an unsupported file on some browsers and
 * simply never settles on others (HEIC is the usual culprit), and a promise that
 * never settles cannot be caught. Without a timeout the only feedback is a button
 * that says "uploading" until the tab is closed.
 */
function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${what} took longer than ${Math.round(ms / 1000)}s and was given up on`)),
      ms,
    );
    work.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

async function downscale(file: File): Promise<Blob> {
  const bitmap = await withTimeout(createImageBitmap(file), 20_000, 'reading the photo');
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('could not encode the image'))),
      'image/webp', QUALITY,
    );
  });
}

export default function PhotoField({
  value, previewUrl, onChange, onBusyChange,
}: {
  /** The stored PATH inside the bucket, not a URL. */
  value: string | null;
  /** A signed URL for whatever `value` points at, if the server already made one. */
  previewUrl?: string | null;
  onChange: (path: string | null) => void;
  /**
   * Lifted so the FORM can disable Save while a photo is in flight.
   *
   * This is the bug that lost Moran a photograph: the form's Save button was
   * disabled on the form's own busy flag, never on this field's, so Save was live
   * during an upload. Pressing it saved the recipe with no photo — which reads
   * exactly like "I saved it and the picture vanished".
   */
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useT();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Signed here after an upload; seeded from the server for a photo already saved.
     The form cannot show a path. */
  const [preview, setPreview] = useState<string | null>(previewUrl ?? null);
  const [saved, setSaved] = useState(false);

  /* One place to flip busy, so the parent can never fall out of step with it. */
  function setUploading(next: boolean) {
    setBusy(next);
    onBusyChange?.(next);
  }

  async function handle(file: File | undefined) {
    if (!file) return;
    setUploading(true); setError(null); setSaved(false);
    try {
      const blob = await downscale(file);
      const db = supabaseBrowser();
      const path = `${crypto.randomUUID()}.webp`;
      const { error: upErr } = await withTimeout(
        db.storage.from('recipe-photos').upload(path, blob, { contentType: 'image/webp' }),
        45_000, 'the upload',
      );
      /* Surface the real reason, code and all. A generic "upload failed" sent us
         hunting through Supabase logs for an error that was never there. */
      if (upErr) {
        const code = (upErr as { statusCode?: string | number }).statusCode;
        throw new Error(code ? `${upErr.message} (${code})` : upErr.message);
      }

      /* A short signed URL, for the preview in this form only.
         What gets SAVED is the path — see lib/photos.ts. This used to mint a
         one-year signed URL and store that, which put a hidden expiry date inside
         every recipe row: a year on, the photograph would disappear and nothing could
         tell that from a deleted file. */
      const { data } = await db.storage
        .from('recipe-photos').createSignedUrl(path, 60 * 10);
      setPreview(data?.signedUrl ?? null);
      setSaved(true);

      // Replacing a photo must delete the old object, or orphans accumulate
      // forever in a bucket nobody ever looks at.
      if (value) await db.storage.from('recipe-photos').remove([value]);

      onChange(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'upload failed');
    } finally {
      setUploading(false);
    }
  }

  /* The toast fades itself. It confirms the upload, NOT the save — the wording says
     so, because the photo is in Storage the moment this appears but the recipe row
     does not point at it until Save. */
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <div className={styles.wrap}>
      {/* The preview slot doubles as the progress surface. A word inside one button
          was the only sign an upload was happening, and on a phone the button is
          below the fold while the photo area is what you are looking at. */}
      {(preview || busy) && (
        <div className={styles.previewWrap}>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
            <img src={preview} alt="" className={styles.preview} />
          )}
          {busy && (
            <div className={styles.overlay}>
              <Loading size="inline" label={t('form.uploading')} />
              <span className={styles.overlayText}>{t('form.uploading')}</span>
            </div>
          )}
        </div>
      )}

      {saved && !busy && (
        <p className={styles.toast} role="status">{t('form.photoSaved')}</p>
      )}

      <div className={styles.buttons}>
        <button type="button" className={styles.drop} disabled={busy}
          onClick={() => camera.current?.click()}>
          {busy ? t('form.uploading') : t('form.takePhoto')}
        </button>
        <button type="button" className={styles.drop} disabled={busy}
          onClick={() => gallery.current?.click()}>
          {t('form.fromGallery')}
        </button>
        {value && (
          <button type="button" className={styles.remove} disabled={busy}
            onClick={() => { onChange(null); setPreview(null); }}>
            Remove
          </button>
        )}
      </div>

      {/* capture="environment" opens the rear camera directly on a phone. */}
      <input ref={camera} type="file" accept="image/*" capture="environment"
        hidden onChange={(e) => handle(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*"
        hidden onChange={(e) => handle(e.target.files?.[0])} />

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
