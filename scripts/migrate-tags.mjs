// Convert free-text Thai tags in `animals.tags` to standard tag ids (src/lib/tags.js).
// DESIGN.md §7.19. Tags that don't match a standard tag are kept exactly as written.
//
// Dry run (default, changes nothing — prints what would change):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-tags.mjs
// Apply:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-tags.mjs --apply
//
// The service-role key bypasses row-level security: run this from your own machine only and
// never commit the key. Take a backup of the animals table (or export it) before --apply.
import { createClient } from '@supabase/supabase-js';
import { resolveTag, buildStoredTags, splitStoredTags } from '../src/lib/tags.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes('--apply');

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first (see the comment at the top of this file).');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: animals, error } = await supabase.from('animals').select('id, name, tags');
if (error) {
  console.error('Could not read animals:', error.message);
  process.exit(1);
}

let changed = 0;
let mapped = 0;
let kept = 0;
const updates = [];

for (const animal of animals) {
  const before = (animal.tags || []).filter(Boolean);
  if (before.length === 0) continue;
  const { ids, custom } = splitStoredTags(before);
  const after = buildStoredTags(ids, custom);
  mapped += before.filter((t) => resolveTag(t)).length;
  kept += custom.length;
  if (JSON.stringify(before) === JSON.stringify(after)) continue;
  changed += 1;
  updates.push({ id: animal.id, after });
  console.log(`${animal.name}\n  before: ${before.join(', ')}\n  after:  ${after.join(', ')}`);
}

console.log(`\n${animals.length} animals · ${changed} would change · ${mapped} tags map to standard ids · ${kept} custom tags kept as written`);

if (!apply) {
  console.log('Dry run only. Re-run with --apply to write these changes.');
  process.exit(0);
}

let failed = 0;
for (const { id, after } of updates) {
  const { error: updateError } = await supabase.from('animals').update({ tags: after }).eq('id', id);
  if (updateError) {
    failed += 1;
    console.error(`Failed to update ${id}: ${updateError.message}`);
  }
}
console.log(`Updated ${updates.length - failed} animals${failed ? `, ${failed} failed` : ''}.`);
process.exit(failed ? 1 : 0);
