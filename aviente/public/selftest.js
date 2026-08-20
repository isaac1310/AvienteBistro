/* Aviente smoke test — run with ?selftest=1
 *
 * Modelled directly on TravelHub's tests/selftest.js, which works well: no build
 * step, no dependencies, results on window.__selftest so a browser agent or CI can
 * assert without re-implementing anything, and a visible panel so a human can read
 * the same run.
 *
 * Two rules carried over verbatim, both learned the hard way over there:
 *
 *   1. A check that cannot run must SKIP with a reason, never `return true`. Two
 *      TravelHub checks once passed at desktop width while exercising nothing.
 *   2. Assertion helpers return a description on failure rather than throwing, so
 *      one bad check cannot abort the run and skip the cleanup.
 *
 * The bias is the same too: most assertions cover bugs that actually shipped —
 * see the git log for the RTL flip, the Times fallback and the XML comment. A
 * suite that only tests what was never broken is decoration.
 */
(function () {
  'use strict';

  const results = [];
  let currentGroup = '';
  const group = (name) => { currentGroup = name; };

  const SKIP = Symbol('skip');
  const skip = (reason) => ({ [SKIP]: true, reason: reason || 'not applicable here' });
  const isSkip = (r) => Boolean(r && typeof r === 'object' && r[SKIP]);

  function check(name, fn) {
    let ok = false, skipped = false, detail = '';
    try {
      const r = fn();
      if (isSkip(r)) { skipped = true; ok = true; detail = r.reason; }
      else { ok = r === true || r === undefined; if (!ok) detail = String(r); }
    } catch (err) {
      ok = false;
      detail = (err && err.message) || String(err);
    }
    results.push({ group: currentGroup, name, ok, skipped, detail });
    return ok;
  }

  /* Helpers return a description on failure instead of throwing. */
  const eq = (actual, expected, label) => actual === expected ? true
    : `${label || 'value'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
  const near = (actual, expected, tol, label) =>
    Math.abs(actual - expected) <= (tol == null ? 0.01 : tol) ? true
    : `${label || 'value'}: expected ~${expected}, got ${actual}`;
  const truthy = (v, label) => v ? true
    : `${label || 'value'}: expected truthy, got ${JSON.stringify(v)}`;

  /* ---------- helpers ---------- */

  const css = (el, prop) => getComputedStyle(el).getPropertyValue(prop).trim();
  const token = (name) => css(document.documentElement, name);

  /** Relative luminance / contrast, so the gold rule can be asserted numerically. */
  function contrast(a, b) {
    const lum = (c) => {
      const [r, g, bl] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)
        .map((v) => v / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    };
    const [x, y] = [lum(a), lum(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /** True when `text` actually rendered in `family`, rather than a silent fallback.
      Measuring width against a known-different fallback is the only reliable way. */
  function rendersIn(text, family) {
    const measure = (f) => {
      const s = document.createElement('span');
      s.style.cssText = `position:absolute;visibility:hidden;font:40px ${f};white-space:pre`;
      s.textContent = text;
      document.body.appendChild(s);
      const w = s.getBoundingClientRect().width;
      s.remove();
      return w;
    };
    return Math.abs(measure(`"${family}"`) - measure('monospace')) > 0.5;
  }

  /* ---------- groups ---------- */

  function designTokens() {
    group('tokens');

    /* The palette moved from gold to the delivered design's muted stone, and the
       SPLIT survived the move because the trap did: --muted is 2.48:1 where the old
       --gold was 2.09:1. Same class of value, same rule — decoration only. */
    check('the decorative tone and its text partner both exist', () =>
      truthy(token('--muted') && token('--muted-ink'), 'both muted tokens'));

    /* The old names still resolve, aliased, so a dozen stylesheets did not have to be
       rewritten in the same commit as a palette change. When they are gone, so is
       this check. */
    check('the retired gold names still resolve', () =>
      truthy(token('--gold-ink'), '--gold-ink alias'));

    check('letterspaced label colour clears WCAG AA on the page', () => {
      const probe = document.createElement('p');
      probe.className = 'eyebrow';
      document.body.appendChild(probe);
      const fg = css(probe, 'color');
      const bg = css(document.body, 'background-color');
      probe.remove();
      const ratio = contrast(fg, bg);
      /* The numbers this guards, measured on the new ground: --muted #A79A85 is
         2.48:1 and fails; --muted-ink #716551 is 5.11:1 and passes. The design sets
         these small caps in #A79A85, which is why the check exists — a regression to
         the decorative tone is invisible to the eye at 11px. */
      return ratio >= 4.5 ? true
        : `letterspaced label contrast is ${ratio.toFixed(2)}:1, needs 4.5 — is it using --muted instead of --muted-ink?`;
    });

    check('theme switch changes the primary', () => {
      const html = document.documentElement;
      const had = html.getAttribute('data-theme');
      /* Switch to the OTHER theme, not always to burgundy. Hardcoding the target made
         this fail for anyone whose theme was already burgundy — it set the attribute
         to the value it already had, nothing changed, and the check reported the app
         broken. Asserting the app, not the harness (AGENTS.md rule 5). */
      const other = had === 'burgundy' ? 'green' : 'burgundy';
      const before = token('--primary');
      html.setAttribute('data-theme', other);
      const after = token('--primary');
      had ? html.setAttribute('data-theme', had) : html.removeAttribute('data-theme');
      return before !== after
        ? true
        : `--primary stayed ${after} when switching ${had ?? 'green'} → ${other}`;
    });
  }

  function typography() {
    group('type');

    check('the serif stack resolves, not Times', () => {
      const h1 = document.querySelector('header h1');
      if (!h1) return skip('no header wordmark on this page');
      const fam = css(h1, 'font-family');
      // The bug this exists for: next/font classes on <body> left --font-* undefined
      // at :root, --ser collapsed, and every heading silently became Times.
      return /Cormorant/i.test(fam) ? true
        : `wordmark font-family is "${fam}" — the token stack has collapsed`;
    });

    check('Cormorant Garamond actually rendered', () =>
      rendersIn('Aviente', 'Cormorant Garamond') ? true
        : 'Cormorant measured the same as monospace — the face did not load');

    check('the Hebrew face actually rendered', () =>
      rendersIn('חלה לשבת', 'Frank Ruhl Libre') ? true
        : 'Frank Ruhl Libre did not load — Hebrew is falling back to a system font');

    /* This check used to assert the OPPOSITE: "Hebrew content is RTL and the chrome
       is not". That was right when the interface was English with Hebrew blocks
       inside it, and it is wrong now — the whole document turns with the reader's
       language. Rewritten rather than deleted: the direction of the page is exactly
       the sort of thing that regresses silently, and a suite that stopped watching it
       would be worse than one that watched for the wrong thing. */
    check('the document direction matches the language', () => {
      const html = document.documentElement;
      const lang = html.getAttribute('lang');
      const dir = css(html, 'direction');
      if (lang === 'he') return eq(dir, 'rtl', 'direction for lang=he');
      if (lang === 'en') return eq(dir, 'ltr', 'direction for lang=en');
      return `<html lang> is ${JSON.stringify(lang)}, expected he or en`;
    });

    /* No emoji in the chrome.
       They have been swept out three times and come back every time, because an
       emoji in a diff is invisible — it looks like content. This scans what is
       actually RENDERED, which is the only place the question can be settled.
       Excludes fields and anything holding recipe text: a family is entitled to put
       an emoji in their own recipe title, and a check that forbade that would be
       wrong rather than strict. */
    check('no emoji in the chrome', () => {
      const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2728}]/u;
      const roots = [...document.querySelectorAll('nav, header, footer, main, article')];
      if (!roots.length) return skip('no chrome on this page');
      const offenders = [];
      for (const root of roots) {
        const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walk.nextNode())) {
          const el = node.parentElement;
          if (!el) continue;
          /* Recipe content and anything typed by a person is not chrome. */
          if (el.closest('input, textarea, [lang="he"][data-user], .dish, .recipeText')) continue;
          const m = node.nodeValue && node.nodeValue.match(EMOJI);
          if (m) offenders.push(`${el.tagName.toLowerCase()}: ${JSON.stringify(node.nodeValue.trim().slice(0, 30))}`);
        }
      }
      return offenders.length === 0
        ? true
        : `${offenders.length} emoji in the chrome, e.g. ${offenders[0]}`;
    });

    /* Latin runs inside an RTL page have bitten three times: "0.5 cup" became
       "cup 0.5" in the ingredient table, the kids' week read "AUG 22 - 16", and the
       schema banner threw its full stop to the front of the sentence. Anything
       carrying digits-then-Latin has to opt out of the surrounding direction. */
    check('Latin runs opt out of RTL', () => {
      if (css(document.documentElement, 'direction') !== 'rtl') {
        return skip('page is not RTL, so nothing to opt out of');
      }
      /* `article` as well as header/main/footer. The recipe page — the one page that
         actually HAS Latin measure runs — renders an <article> at top level, so the
         scoping borrowed from the tap-target check found nothing and the assertion
         skipped itself with "no Latin measure runs on this page" while sitting on a
         table full of "2 tbsp". A check that passes by exercising nothing is worse
         than no check. */
      const suspects = [...document.querySelectorAll('article, header, main, footer')]
        .flatMap((root) => [...root.querySelectorAll('td, span, p')])
        .filter((el) => el.children.length === 0
          && /^[\d\s./–-]+\s?[A-Za-z]{1,6}$/.test((el.textContent || '').trim()));
      if (!suspects.length) return skip('no Latin measure runs on this page');
      const wrong = suspects.filter((el) => css(el, 'direction') !== 'ltr');
      return wrong.length === 0
        ? true
        : `${wrong.length} Latin run(s) inherit RTL, e.g. ${JSON.stringify(wrong[0].textContent.trim())}`;
    });
  }

  function layout() {
    group('layout');

    check('the page does not scroll sideways', () => {
      const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return over <= 0 ? true : `page scrolls sideways by ${over}px at ${innerWidth}px wide`;
    });

    check('tap targets are at least 44px', () => {
      if (innerWidth > 500) return skip('phone-width concern only');
      const controls = document.querySelectorAll(
        ':is(header, main, footer) :is(button, a[href], input, select)');
      if (!controls.length) return skip('no interactive controls on this page yet');
      for (const c of controls) {
        const h = c.getBoundingClientRect().height;
        if (h && h < 44) return `"${(c.textContent || c.tagName).trim().slice(0, 24)}" is ${h.toFixed(0)}px tall`;
      }
      return true;
    });

    check('the gold rule carries its diamond', () => {
      const rule = document.querySelector('.rule');
      if (!rule) return skip('no divider on this page');
      return truthy(getComputedStyle(rule, '::after').content !== 'none',
        'the ::after diamond');
    });
  }

  function splash() {
    group('splash');

    check('it is gone, or held on purpose', () => {
      const held = new URLSearchParams(location.search).get('splash') === 'hold';
      const el = document.querySelector('[role="status"][aria-label="Aviente"]');
      if (held) return truthy(el, 'held splash should be present');
      // Not merely transparent: an opaque overlay is still hit-testable while
      // fading, which is how a splash swallows the first tap.
      return el ? 'the splash is still in the DOM and can still eat a tap' : true;
    });
  }

  function parser() {
    group('parser');
    const A = window.Aviente;
    if (!A?.parseIngredientLine) {
      check('parser exposed', () => skip('window.Aviente not attached — is NEXT_PUBLIC_E2E set?'));
      return;
    }

    const line = (s) => A.parseIngredientLine(s);

    check('grams', () => {
      const r = line('500 גרם קמח לבן');
      return eq(r.amount, 500, 'amount') === true
        ? eq(r.unit, 'g', 'unit') : eq(r.amount, 500, 'amount');
    });
    check('a range keeps both ends', () => {
      const r = line("400-500 גרם ג'ינג'ר טרי");
      if (r.amount !== 400) return `low end: got ${r.amount}`;
      return eq(r.amountMax, 500, 'high end');
    });
    check('כוס maps to cup', () => eq(line('2.5 כוסות אורז').unit, 'cup', 'unit'));
    check('קורט maps to pinch', () => eq(line('קורט פלפל שחור').unit, 'pinch', 'unit'));
    check('a bare measure word means one', () => {
      const r = line('כף שמיר');
      return r.amount === 1 && r.unit === 'tbsp' ? true
        : `got ${r.amount} ${r.unit}`;
    });
    check('a counted noun becomes pcs', () => {
      const r = line('4 ביצים');
      return r.amount === 4 && r.unit === 'pcs' ? true : `got ${r.amount} ${r.unit}`;
    });
    check('no quantity is preserved, not invented', () => {
      const r = line('בצל ירוק');
      if (r.amount !== null) return `invented an amount: ${r.amount}`;
      if (r.unit === 'to taste') return "coerced to 'to taste', which says something different";
      return eq(r.name, 'בצל ירוק', 'name');
    });
    check('a parenthetical becomes a note', () =>
      eq(line('250 מ"ל מים פושרים (לפי הצורך)').note, 'לפי הצורך', 'note'));
    check('half a teaspoon', () => near(line('½ כפית מלח').amount, 0.5, 0.001, 'amount'));
    check('a Latin parenthetical splits into title_en', () =>
      eq(A.splitTitle('גזלמה תרד וגבינות (Gözleme)').titleEn, 'Gözleme', 'titleEn'));
    check('Hebrew parentheses do NOT split', () =>
      eq(A.splitTitle('תמצית ג\'ינג\'ר (להקפאה)').titleEn, null, 'titleEn'));
    check('breads absorbs the baked goods', () =>
      eq(A.mapCategory('מאפים מסורתיים').category, 'breads', 'category'));
    check('an unknown schemaVersion is refused, not guessed', () => {
      const out = A.normalizeDocument({ schemaVersion: 99, recipes: [] });
      return out.errors.length ? true : 'accepted an unknown schemaVersion';
    });
    check('stray prose around the JSON is tolerated', () => {
      const out = A.parsePastedJson('Sure! ```json\n{"title":"x"}\n``` hope that helps');
      return out.data?.title === 'x' ? true : `failed: ${out.error}`;
    });
  }

  function scaling() {
    group('scaling');
    const A = window.Aviente;
    if (!A?.scaleAmount) {
      check('scaling exposed', () => skip('window.Aviente.scaleAmount missing'));
      return;
    }

    /* Minimal ingredient shapes; only the fields scaleAmount reads. */
    const ing = (o) => Object.assign(
      { id: 'x', position: 0, name: 'n', amount: null, amount_max: null, unit: null, note: null }, o);
    const at = (o, f) => A.scaleAmount(ing(o), f);

    check('grams scale', () => eq(at({ amount: 500, unit: 'g' }, 2).text, '1 kg',
      'g promotes to kg past 1000'));
    check('a range scales at BOTH ends', () =>
      eq(at({ amount: 400, amount_max: 500, unit: 'g' }, 1.5).text, '600–750 g', 'range'));
    check('pcs rounds UP, not to 4.5', () => {
      const r = at({ amount: 3, unit: 'pcs' }, 1.5);
      return r.text === '5' && r.approximate ? true
        : `got "${r.text}" approximate=${r.approximate}`;
    });
    check('to taste is never multiplied', () =>
      eq(at({ unit: 'to taste' }, 3).text, 'to taste', 'to taste'));
    check('pinch is never multiplied', () =>
      eq(at({ unit: 'pinch' }, 3).text, 'pinch', 'pinch'));
    check('no quantity stays absent, not zero', () =>
      at({}, 2) === null ? true : `expected null, got ${JSON.stringify(at({}, 2))}`);
    check('ml promotes to l', () =>
      eq(at({ amount: 600, unit: 'ml' }, 2).text, '1.2 l', 'ml → l'));
    check('a yield-only recipe offers no scaling', () => {
      const opts = A.servingOptions(null);
      return opts.length === 0 ? true : `expected no options, got ${JSON.stringify(opts)}`;
    });
    check('a portioned recipe does offer scaling', () =>
      A.servingOptions(6).length > 1 ? true : 'expected several serving options');
    check('scaleFactor is 1 when there is no base', () =>
      eq(A.scaleFactor(12, null), 1, 'factor'));
  }


  function occasions() {
    group('occasions');
    const A = window.Aviente;
    if (!A?.resolveOccasion) { check('occasion exposed', () => skip('not attached')); return; }

    const RULES = [
      { id: '1', match: { weekday: 5, from: 'evening' }, title: 'Shabbat Dinner',
        subtitle: null, ornament: 'candles', priority: 10 },
      { id: '2', match: { hebcal: 'Rosh Hashana', from: 'evening' }, title: 'Rosh Hashanah',
        subtitle: null, ornament: 'apple', priority: 100 },
    ];
    const on = (iso, when) => A.resolveOccasion(new Date(iso + 'T12:00:00'), when, RULES);

    check('Friday EVENING is Shabbat', () =>
      eq(on('2026-08-07', 'evening')?.title, 'Shabbat Dinner', 'title'));

    // The sundown bug: a lunch menu on the same Friday must NOT be Shabbat dinner.
    check('Friday LUNCH is not Shabbat', () => {
      const r = on('2026-08-07', 'day');
      return r === null ? true : `expected no occasion, got "${r.title}"`;
    });

    check('Thursday evening is not Shabbat', () => {
      const r = on('2026-08-06', 'evening');
      return r === null ? true : `expected no occasion, got "${r.title}"`;
    });

    // The staleness bug: one hebcal KEY must resolve across different years,
    // which a stored Gregorian date could never do.
    check('a holiday key resolves in two different years', () => {
      const years = [2026, 2027].map((y) => {
        for (let d = new Date(`${y}-09-01T12:00:00`); d < new Date(`${y}-10-15T12:00:00`);
             d.setDate(d.getDate() + 1)) {
          const r = A.resolveOccasion(new Date(d), 'evening', RULES);
          if (r?.title === 'Rosh Hashanah') return d.toISOString().slice(0, 10);
        }
        return null;
      });
      if (years.some((y) => !y)) return `not found in ${JSON.stringify(years)}`;
      // Different Gregorian dates each year is the entire point.
      return years[0] !== years[1] ? true : `same date both years: ${years[0]}`;
    });

    check('the higher-priority rule wins', () => {
      const r = A.resolveOccasion(new Date('2026-09-11T12:00:00'), 'evening', [
        { id: 'a', match: { weekday: 5, from: 'evening' }, title: 'Low', subtitle: null, ornament: null, priority: 1 },
        { id: 'b', match: { weekday: 5, from: 'evening' }, title: 'High', subtitle: null, ornament: null, priority: 99 },
      ]);
      return eq(r?.title, 'High', 'title');
    });
  }

  function kidsWeek() {
    group('kids');
    const A = window.Aviente;
    if (!A?.sundayOf) { check('kids helpers exposed', () => skip('not attached')); return; }

    // The week runs Sunday -> Saturday. 2026-08-02 is a Sunday; 08-08 the Saturday.
    check('Sunday maps to itself', () =>
      eq(A.sundayOf(new Date('2026-08-02T12:00:00')), '2026-08-02', 'week start'));
    check('Wednesday maps back to Sunday', () =>
      eq(A.sundayOf(new Date('2026-08-05T12:00:00')), '2026-08-02', 'week start'));
    check('Saturday still belongs to the week that started', () =>
      eq(A.sundayOf(new Date('2026-08-08T12:00:00')), '2026-08-02', 'week start'));
    // The next Sunday starts the NEXT week, which is the boundary the old
    // Monday-based helper put in a different place.
    check('the next Sunday is a new week', () =>
      eq(A.sundayOf(new Date('2026-08-09T12:00:00')), '2026-08-09', 'week start'));
    check('week arithmetic stays on Sundays', () =>
      eq(A.addWeeks('2026-08-02', 2), '2026-08-16', 'two weeks on'));
    check('every day of the week has a host', () =>
      eq(new Set((A.ANIMALS || []).map((a) => a.weekday)).size, 7, 'distinct weekdays'));
  }

  function redirects() {
    group('auth');
    const A = window.Aviente;
    if (!A?.safeNext) { check('safeNext exposed', () => skip('not attached')); return; }

    /* ?next= reaches router.replace and the auth callback. Unvalidated it turns a
       login link into a phishing hop, and the client had no check at all. */
    const bad = ['https://evil.example', '//evil.example', '%2f%2fevil.example',
                 '\\\\evil.example', '/https:/evil', 'javascript:alert(1)', ''];
    check('hostile next values all become /', () => {
      for (const v of bad) {
        const got = A.safeNext(v);
        if (got !== '/') return `safeNext(${JSON.stringify(v)}) returned ${JSON.stringify(got)}`;
      }
      return true;
    });
    check('an internal path survives', () =>
      eq(A.safeNext('/menus/new?date=2026-08-07'), '/menus/new?date=2026-08-07', 'path'));
  }

  function backupRoundTrip() {
    group('backup');
    const A = window.Aviente;
    if (!A?.normalizeDocument) { check('parser exposed', () => skip('not attached')); return; }

    /* Export → import must not change a recipe. Ranges, groups, per-recipe source
       and titleEn were all being dropped here, silently. */
    const doc = { schemaVersion: 1, recipes: [{
      title: 'קציצות', titleEn: 'Patties', category: 'mains', servings: 6,
      source: 'Savta', externalRef: 'x#y',
      photoPath: 'abc-123.webp',
      ingredients: [
        { name: 'דג', amount: 400, amountMax: 500, unit: 'g', note: 'נטו', group: 'לקציצות' },
        { name: 'בצל ירוק' },
      ],
      steps: [{ heading: 'בצק', body: 'ללוש' }],
    }] };
    const r = A.normalizeDocument(doc).recipes[0];

    check('an amount RANGE survives a round trip', () =>
      r.ingredients[0].amountMax === 500 ? true
        : `amountMax came back as ${JSON.stringify(r.ingredients[0].amountMax)}`);
    check('an ingredient GROUP survives', () =>
      eq(r.ingredients[0].group, 'לקציצות', 'group'));
    check('per-recipe SOURCE survives', () => eq(r.source, 'Savta', 'source'));
    check('an explicit titleEn is not overwritten', () => eq(r.titleEn, 'Patties', 'titleEn'));
    check('externalRef survives', () => eq(r.externalRef, 'x#y', 'externalRef'));
    check('an ingredient with no quantity is kept', () =>
      r.ingredients.length === 2 ? true : `expected 2 ingredients, got ${r.ingredients.length}`);
    /* The photograph's Storage path. normalizeRecipe rebuilds the object field by
       field, so an unnamed field is silently dropped — this is the third time that
       has bitten (group, amountMax, and now photoPath). */
    check('photoPath survives', () => eq(r.photoPath, 'abc-123.webp', 'photoPath'));

    /* The document format version, and the reason this group exists at all.
       /api/backup stamped the DB MIGRATION counter here instead. It read 11 while the
       importer accepts only 1, so every backup was refused by the app that wrote it —
       and nothing noticed, because this suite tested the parser against a document it
       built itself rather than against the number the export actually emits. */
    check('the exporter and the importer agree on the document version', () => {
      if (!A.DOCUMENT_VERSION) return skip('exporter version not attached');
      return A.DOCUMENT_VERSION === 1
        ? true
        : `export stamps ${A.DOCUMENT_VERSION}, importer accepts 1`;
    });
    check('a document from a FUTURE format is refused, not half-read', () => {
      const out = A.normalizeDocument({ schemaVersion: 99, recipes: [] });
      return out.errors.length > 0 ? true : 'schemaVersion 99 was accepted';
    });
  }

  /* ---------- the run ---------- */

  function tally() {
    return {
      pass: results.filter((r) => r.ok && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      fail: results.filter((r) => !r.ok).length,
    };
  }
  const verdict = (r) => (r.skipped ? 'SKIP' : r.ok ? 'pass' : 'FAIL');

  function run() {
    /* TravelHub refuses outright when joined to a shared room, because its suite
       mutates real trip data. Aviente's equivalent hazard: there is only ONE
       Supabase project, holding the family's only copy of these recipes. So this
       suite is READ-ONLY by construction -- it touches the DOM, the tokens and the
       pure parser, and never writes to the database. Any check that needs to write
       belongs in the Playwright regression suite, which tags and cleans its own
       fixtures. If you are tempted to add a write here, don't. */
    designTokens();
    typography();
    layout();
    splash();
    parser();
    scaling();
    occasions();
    kidsWeek();
    redirects();
    backupRoundTrip();

    const t = tally();
    window.__selftest = { ...t, results, version: document.body.dataset.version || null };
    const line = `selftest — ${t.pass} passed, ${t.skipped} skipped, ${t.fail} failed`;
    (t.fail ? console.error : console.log)(line);
    renderPanel();
  }

  function renderPanel() {
    document.getElementById('selftest-panel')?.remove();
    const panel = document.createElement('div');
    panel.id = 'selftest-panel';
    panel.style.cssText = [
      'position:fixed', 'inset:auto 12px 12px 12px', 'z-index:100000',
      'max-height:60vh', 'overflow:auto', 'background:#fff', 'color:#222',
      'border-radius:2px', 'box-shadow:0 8px 40px rgba(0,0,0,.3)',
      'font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace', 'padding:14px 16px',
    ].join(';');

    const { pass, skipped, fail } = tally();
    const colour = (r) => (r.skipped ? '#b7791f' : r.ok ? '#1e8449' : '#c0392b');
    const rows = results.map((r) =>
      `<tr><td style="padding:2px 8px 2px 0;color:${colour(r)}">${verdict(r)}</td>` +
      `<td style="padding:2px 8px 2px 0;color:#888">${r.group}</td>` +
      `<td style="padding:2px 0">${r.name}` +
      `${r.detail ? `<div style="color:${colour(r)}">${r.detail}</div>` : ''}</td></tr>`
    ).join('');

    panel.innerHTML =
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
         <strong style="color:${fail ? '#c0392b' : skipped ? '#b7791f' : '#1e8449'}">
           selftest — ${pass} passed${skipped ? `, ${skipped} skipped` : ''}, ${fail} failed
         </strong>
         <button type="button" onclick="this.closest('#selftest-panel').remove()"
           style="border:0;background:#eee;border-radius:2px;padding:4px 10px;cursor:pointer">close</button>
       </div><table style="border-collapse:collapse">${rows}</table>`;
    document.body.appendChild(panel);
  }

  /* Wait until the app is actually ready before asserting anything, or the suite
     reports false failures about its own timing:
       — fonts, because font-dependent measurements taken too early look like a
         failed load;
       — the splash, because the app is not ready while the cover is still up, and
         the first run of this suite failed on exactly that race.
     Both are raced against a ceiling so a genuine hang still produces a report. */
  function whenReady(done) {
    const held = new URLSearchParams(location.search).get('splash') === 'hold';
    const deadline = Date.now() + 6000;
    const splashGone = () => held
      || !document.querySelector('[role="status"][aria-label="Aviente"]')
      || Date.now() > deadline;
    const poll = () => (splashGone() ? done() : setTimeout(poll, 100));
    const fonts = document.fonts?.ready ?? Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, 3000))]).then(poll, poll);
  }

  whenReady(() => setTimeout(run, 0));
})();
