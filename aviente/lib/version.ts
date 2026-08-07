/* The version footer exists for one reason: §9.5's manual test pass must never be
 * performed against a cached build. TravelHub learned this the hard way -- testing
 * the wrong build is worse than not testing, because it produces confident wrong
 * answers. Bump APP_VERSION on every release and check it before testing.
 *
 * major = schema change · minor = features · patch = fixes
 */
export const APP_VERSION = '0.9.0';

/** Bumped only when supabase/migrations change shape. Shown beside the version. */
export const SCHEMA_VERSION = 1;

export const BUILD_LABEL = `Aviente v${APP_VERSION} · schema ${SCHEMA_VERSION}`;
