'use client';

import { useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from './PhotoField.module.css';

/* §3.4's photo control: 📷 TAKE PHOTO / 🖼 FROM GALLERY.
 *
 * The downscale is the point. A phone photo is 3–12MB; unresized it would
 * exhaust Supabase's 1GB free Storage in about a hundred recipes and crawl on a
 * kitchen connection. Everything is resized to 1600px WebP before it leaves the
 * device — typically ~200KB, a 30-50x reduction.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.85;

async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
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
  value, previewUrl, onChange,
}: {
  /** The stored PATH inside the bucket, not a URL. */
  value: string | null;
  /** A signed URL for whatever `value` points at, if the server already made one. */
  previewUrl?: string | null;
  onChange: (path: string | null) => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Signed here after an upload; seeded from the server for a photo already saved.
     The form cannot show a path. */
  const [preview, setPreview] = useState<string | null>(previewUrl ?? null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const blob = await downscale(file);
      const db = supabaseBrowser();
      const path = `${crypto.randomUUID()}.webp`;
      const { error: upErr } = await db.storage
        .from('recipe-photos').upload(path, blob, { contentType: 'image/webp' });
      if (upErr) throw upErr;

      /* A short signed URL, for the preview in this form only.
         What gets SAVED is the path — see lib/photos.ts. This used to mint a
         one-year signed URL and store that, which put a hidden expiry date inside
         every recipe row: a year on, the photograph would disappear and nothing could
         tell that from a deleted file. */
      const { data } = await db.storage
        .from('recipe-photos').createSignedUrl(path, 60 * 10);
      setPreview(data?.signedUrl ?? null);

      // Replacing a photo must delete the old object, or orphans accumulate
      // forever in a bucket nobody ever looks at.
      if (value) await db.storage.from('recipe-photos').remove([value]);

      onChange(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {value && preview && (
        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
        <img src={preview} alt="" className={styles.preview} />
      )}

      <div className={styles.buttons}>
        <button type="button" className={styles.drop} disabled={busy}
          onClick={() => camera.current?.click()}>
          📷 {busy ? 'Uploading…' : 'Take photo'}
        </button>
        <button type="button" className={styles.drop} disabled={busy}
          onClick={() => gallery.current?.click()}>
          🖼 From gallery
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
