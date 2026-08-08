/* The version footer exists for one reason: §9.5's manual test pass must never be
 * performed against a cached build. TravelHub learned this the hard way -- testing
 * the wrong build is worse than not testing, because it produces confident wrong
 * answers. Bump APP_VERSION on every release and check it before testing.
 *
 * major = schema change · minor = features · patch = fixes
 */
export const APP_VERSION = '0.9.0';

/**
 * The highest migration this build requires.
 *
 * No longer decorative. lib/schema.ts compares it to what the database actually
 * reports in `schema_migrations`, and the app says so when it is behind — 0008 was
 * merged without being run and took /menus down in production with a 500 that named
 * nothing. Bump this in the SAME commit as the migration that needs it.
 */
export const SCHEMA_VERSION = 11;

export const BUILD_LABEL = `Aviente v${APP_VERSION} · schema ${SCHEMA_VERSION}`;
