-- Let guests read the occasion rules.
--
-- Found by looking at a real shared menu: the candles were missing from the guest
-- card but present for a signed-in member. The cause is that 0002 revoked every
-- table from `anon`, including this one — so the guest page resolved no occasion,
-- got a null ornament, and drew no candles.
--
-- This table holds no family data. It is a static list of holiday titles and
-- ornaments ("Rosh Hashanah Dinner", "candles"), identical for every family that
-- might use this app. Nothing here is worth protecting, and the alternative —
-- threading the ornament through fetch_shared_menu — would put presentation logic
-- into the security boundary for no benefit.

grant select on occasion_rules to anon;

create policy occasion_rules_public_read on occasion_rules
  for select to anon
  using (true);
