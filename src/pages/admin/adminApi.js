// Admin actions shared by the console sections. Each one writes the admin activity log.
import { supabase } from '../../services/supabaseClient';

// Before migration 029 the suspension reason / date columns don't exist yet
const missingColumn = (error) => /banned_reason|banned_at|column/i.test(error?.message || '');

export async function logAction(adminId, action, targetId, detail = null) {
  try {
    await supabase.from('admin_audit_log').insert({ admin_id: adminId, action, target_id: targetId, detail });
  } catch (err) {
    console.warn('[Admin] audit log failed', err);
  }
}

/** Change someone's role. Making them a foundation also marks their foundation as approved
 *  (otherwise they'd be stuck on the "waiting for approval" page), as the old screen did. */
export async function setRole(adminId, person, role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', person.id);
  if (error) throw error;
  if (role === 'foundation') {
    const { data: existing } = await supabase.from('foundation_profiles').select('id').eq('id', person.id).maybeSingle();
    const review = { verification_status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: adminId };
    const { error: fError } = existing
      ? await supabase.from('foundation_profiles').update(review).eq('id', person.id)
      : await supabase.from('foundation_profiles').insert({ id: person.id, foundation_name: person.full_name || person.email || '-', ...review });
    if (fError) throw fError;
  }
  await logAction(adminId, 'UPDATE_ROLE', person.id, { old_role: person.role || 'user', new_role: role, email: person.email || null });
}

export async function suspend(adminId, person, reason) {
  const at = new Date().toISOString();
  let res = await supabase.from('profiles').update({ is_banned: true, banned_reason: reason, banned_at: at }).eq('id', person.id);
  if (res.error && missingColumn(res.error)) res = await supabase.from('profiles').update({ is_banned: true }).eq('id', person.id);
  if (res.error) throw res.error;
  await logAction(adminId, 'BAN_USER', person.id, { reason, email: person.email || null });
  return { is_banned: true, banned_reason: reason, banned_at: at };
}

export async function unsuspend(adminId, person) {
  let res = await supabase.from('profiles').update({ is_banned: false, banned_reason: null, banned_at: null }).eq('id', person.id);
  if (res.error && missingColumn(res.error)) res = await supabase.from('profiles').update({ is_banned: false }).eq('id', person.id);
  if (res.error) throw res.error;
  await logAction(adminId, 'UNBAN_USER', person.id, { email: person.email || null });
  return { is_banned: false, banned_reason: null, banned_at: null };
}

/** Signed links (1 hour) to a foundation's uploaded documents: [{ type, url }] */
export async function foundationDocuments(foundationId) {
  const { data: docs, error } = await supabase.from('foundation_documents').select('doc_type, file_path').eq('foundation_id', foundationId);
  if (error) throw error;
  const out = [];
  for (const doc of docs || []) {
    const { data } = await supabase.storage.from('foundation-docs').createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) out.push({ type: doc.doc_type, url: data.signedUrl });
  }
  return out;
}

/** Send a message to someone's support chat (opens one if they have none). Used for warnings. */
export async function messageUser(adminId, userId, text) {
  let { data: chat } = await supabase.from('support_chats').select('id').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!chat) {
    const created = await supabase.from('support_chats').insert({ user_id: userId, status: 'open' }).select('id').single();
    if (created.error) throw created.error;
    chat = created.data;
  }
  const { error } = await supabase.from('support_messages').insert({ chat_id: chat.id, sender_id: adminId, text });
  if (error) throw error;
  await supabase.from('support_chats').update({ updated_at: new Date().toISOString() }).eq('id', chat.id);
  return chat.id;
}
