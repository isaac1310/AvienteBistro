/**
 * The backup document — ONE definition of its columns and its shape.
 *
 * Plain .mjs (JSDoc-typed) so both the API route (app/api/backup/route.ts) and the
 * Node tool (tools/backup-check.mjs) import the same code: Node 22 does not run .ts,
 * and a tool that re-typed the column list would be exactly the drift this file exists
 * to prevent. Same precedent as lib/recipeParse.mjs.
 *
 * The document is the shape the paste importer accepts (schemaVersion from
 * recipeParse, NOT the migration counter — see the header comment in the route).
 */
import { SCHEMA_VERSION } from './recipeParse.mjs';

/** The select for `recipes`, children embedded, exactly as the export needs them. */
export const BACKUP_SELECT = `title, title_en, category, meal_type, description_he, description_en,
             story, serving_suggestions, prep_minutes, cook_minutes, servings,
             yield_text, external_ref, updated_at,
             source:family_members!recipes_source_member_id_fkey(name),
             photo_path,
             ingredients(position, name, amount, amount_max, unit, note, group_label),
             steps(position, heading, body)`;

/**
 * @typedef {{ title: string, title_en: string|null, category: string, meal_type: string|null,
 *   description_he: string|null, description_en: string|null, story: string|null,
 *   serving_suggestions: string|null, prep_minutes: number|null, cook_minutes: number|null,
 *   servings: number|null, yield_text: string|null, external_ref: string|null,
 *   updated_at: string, photo_path: string|null, source: { name: string }|null,
 *   ingredients: { position: number, name: string, amount: number|null, amount_max: number|null,
 *     unit: string|null, note: string|null, group_label: string|null }[],
 *   steps: { position: number, heading: string|null, body: string }[] }} BackupRow
 */

/**
 * Rows → the document. Child rows are sorted here, because child-row order is meaning
 * and the export is the last copy anyone may ever read.
 * @param {BackupRow[]} rows
 * @param {string} exportedBy
 */
export function toBackupDocument(rows, exportedBy) {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy,
    recipes: rows.map((r) => ({
      title: r.title,
      titleEn: r.title_en,
      category: r.category,
      mealType: r.meal_type,
      servings: r.servings,
      yieldText: r.yield_text,
      prepMinutes: r.prep_minutes,
      cookMinutes: r.cook_minutes,
      source: r.source?.name ?? null,
      descriptionHe: r.description_he,
      descriptionEn: r.description_en,
      story: r.story,
      servingSuggestions: r.serving_suggestions,
      externalRef: r.external_ref,
      /* Where the photograph lives in Storage. On its own it does not restore the
         image — that needs the companion zip from /api/backup/photos — but without it
         a restore cannot reconnect a recovered file to its recipe. */
      photoPath: r.photo_path,
      ingredients: [...r.ingredients].sort((a, b) => a.position - b.position)
        .map((i) => ({
          name: i.name, amount: i.amount, amountMax: i.amount_max,
          unit: i.unit, note: i.note,
          /* Sub-group headings ("מילוי", "רוטב"). Dropped once, so a restore flattened
             every grouped recipe into one list. */
          group: i.group_label,
        })),
      steps: [...r.steps].sort((a, b) => a.position - b.position)
        .map((s) => ({ heading: s.heading, body: s.body })),
    })),
  };
}
