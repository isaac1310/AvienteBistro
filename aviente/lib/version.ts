/* The version footer exists for one reason: §9.5's manual test pass must never be
 * performed against a cached build. TravelHub learned this the hard way -- testing
 * the wrong build is worse than not testing, because it produces confident wrong
 * answers. Bump APP_VERSION on every release and check it before testing.
 *
 * major = a break in something OUTSIDE the code that someone depends on: a share
 *   link, the backup document format, the printed card. NOT "a schema change" — that
 *   is what this comment used to say, and it would make every additive migration a
 *   major while a redesign of an already-shared /m/ card counted as a patch. v11.0.0
 *   is a major by this definition, because the menu card was redrawn and existing
 *   share links now show the new design.
 * minor = features, additive migrations included · patch = fixes
 */
export const APP_VERSION = '11.3.0';

/**
 * The highest migration this build requires.
 *
 * Named DB_SCHEMA_VERSION, not SCHEMA_VERSION, and the name is the fix for a real
 * bug. `lib/recipeParse.mjs` exports its own SCHEMA_VERSION meaning "the version of
 * the backup DOCUMENT FORMAT", which is 1 and changes almost never. The backup route
 * imported THIS constant instead, so bumping the migration counter 1 → 11 stamped
 * every export with a document version the importer refuses — a backup that cannot be
 * restored, produced by the button whose entire job is disaster recovery.
 *
 * Two numbers that mean different things must not share a name. Bump this one in the
 * SAME commit as the migration that needs it.
 */
export const DB_SCHEMA_VERSION = 20;

export const BUILD_LABEL = `Aviente v${APP_VERSION} · schema ${DB_SCHEMA_VERSION}`;
