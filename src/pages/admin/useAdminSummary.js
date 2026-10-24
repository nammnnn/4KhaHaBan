// What the admin needs to act on, plus a few health numbers. Shared by the console header
// (badges on the section chips) and the overview page.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

const DAY = 24 * 60 * 60 * 1000;
// When the admin last opened each support chat: { chatId: iso }
const SEEN_KEY = 'admin_support_seen';
export const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; } };
export const markSeen = (id) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify({ ...readSeen(), [id]: new Date().toISOString() })); } catch { /* ignore */ } };

const ok = (r) => { if (r.error) throw r.error; return r; };
const count = (q) => q.then((r) => ok(r).count || 0);

export function useAdminSummary() {
  const [state, setState] = useState({ loading: true, error: false, data: null });

  const load = useCallback(async () => {
    if (!supabase) { setState({ loading: false, error: false, data: null }); return; }
    setState((s) => ({ ...s, loading: !s.data, error: false }));
    try {
      const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
      const [
        { data: foundations },
        { data: incidents },
        { data: reports },
        { data: support },
        users, newUsers, available, adopted, pendingMatches,
      ] = await Promise.all([
        supabase.from('foundation_profiles').select('id, foundation_name, submitted_at').eq('verification_status', 'pending').order('submitted_at', { ascending: true }).then(ok),
        supabase.from('incident_reports').select('id, created_at, urgency').eq('status', 'pending').order('created_at', { ascending: true }).then(ok),
        supabase.from('reports').select('id, created_at').neq('status', 'resolved').order('created_at', { ascending: true }).then(ok),
        supabase.from('support_chats').select('id, updated_at').eq('status', 'open').then(ok),
        count(supabase.from('profiles').select('id', { count: 'exact', head: true })),
        count(supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo)),
        count(supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'available')),
        count(supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'adopted')),
        count(supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      ]);
      // Optional extras: the payout-change table only exists after migration 030
      const [payout, staleMatches] = await Promise.all([
        supabase.from('foundation_payout_changes').select('*').is('reviewed_at', null).order('changed_at', { ascending: true })
          .then((r) => (r.error ? null : r.data || [])),
        supabase.from('matches').select('id, created_at, animal_id, user_id').eq('status', 'pending').lt('created_at', new Date(Date.now() - 3 * DAY).toISOString()).order('created_at', { ascending: true })
          .then((r) => (r.error ? [] : r.data || [])),
      ]);
      const seen = readSeen();
      setState({
        loading: false,
        error: false,
        data: {
          foundations: foundations || [],
          incidents: incidents || [],
          staleIncidents: (incidents || []).filter((i) => Date.now() - new Date(i.created_at) > DAY),
          reports: reports || [],
          support: support || [],
          supportUnread: (support || []).filter((c) => c.updated_at > (seen[c.id] || '')).length,
          payout, // null = migration 030 not run yet
          staleMatches,
          stats: { users, newUsers, available, adopted, pendingMatches },
        },
      });
    } catch (err) {
      console.error('[Admin] summary failed', err);
      setState((s) => ({ loading: false, error: true, data: s.data }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

/** "3 days" style age of the oldest item, or null */
export function oldestAgeDays(items, field) {
  if (!items?.length) return null;
  const oldest = Math.min(...items.map((i) => new Date(i[field] || Date.now()).getTime()));
  return Math.max(0, Math.floor((Date.now() - oldest) / DAY));
}
