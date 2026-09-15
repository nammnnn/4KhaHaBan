import { supabase } from './supabaseClient';

// In-memory caches for ultra-fast instant lookups (0ms latency on repeated accesses)
const animalCache = new Map();
const userVerifCache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes TTL

export const api = {
  /**
   * Fetch all available animals for adoption
   */
  async getAnimals(userId) {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase.from('animals').select('*');
      if (error) {
        console.error("Error fetching animals from Supabase:", error);
        return [];
      }
      
      let allAnimals = (data || []).filter(a => a.status === 'available');

      // Warm in-memory cache for 0ms transitions to profile/chat
      if (allAnimals.length > 0) {
        const now = Date.now();
        allAnimals.forEach(a => {
          if (a && a.id) animalCache.set(a.id, { data: a, timestamp: now });
        });
      }
      
      // Filter out already swiped animals if userId is provided
      if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
        // 1. Fetch user's existing matches
        const { data: matches } = await supabase
          .from('matches')
          .select('animal_id')
          .eq('user_id', userId);

        // 2. Fetch user's swipes
        const { data: swipes } = await supabase
          .from('swipes')
          .select('animal_id, action')
          .eq('user_id', userId);

        const matchedIds = new Set((matches || []).map(m => m.animal_id));
        const likedIds = new Set(
          (swipes || [])
            .filter(s => s.action === 'like' || s.action === 'superlike')
            .map(s => s.animal_id)
        );

        // สัตว์ที่ผู้ใช้ยังไม่เคยกด Like หรือ Match (ป้องกันการส่งคำขอรับเลี้ยงซ้ำ)
        const eligibleAnimals = allAnimals.filter(a => !matchedIds.has(a.id) && !likedIds.has(a.id));

        const nopedIds = new Set(
          (swipes || [])
            .filter(s => s.action === 'nope')
            .map(s => s.animal_id)
        );

        // สัตว์ที่ยังไม่เคยถูกปัดเลยในรอบนี้
        const freshAnimals = eligibleAnimals.filter(a => !nopedIds.has(a.id));
        const recycledAnimals = eligibleAnimals.filter(a => nopedIds.has(a.id));

        // หากผู้ใช้ปัดครบหมดทุกตัวแล้ว ล้างประวัติ nope ในฐานข้อมูลเพื่อให้รอบใหม่เริ่มขึ้น
        if (freshAnimals.length === 0 && eligibleAnimals.length > 0) {
          try {
            await supabase
              .from('swipes')
              .delete()
              .eq('user_id', userId)
              .eq('action', 'nope');
          } catch (delErr) {
            console.warn('Could not clear nope swipes:', delErr);
          }
          return eligibleAnimals.sort(() => Math.random() - 0.5);
        }

        // จัดเรียง: ตัวที่ยังไม่เคยปัดขึ้นก่อน ตามด้วยตัวที่เคยปัดข้าม (สลับแบบสุ่ม) เพื่อให้การ์ดวนลูปต่อเนื่อง
        const shuffledRecycled = recycledAnimals.sort(() => Math.random() - 0.5);
        return [...freshAnimals, ...shuffledRecycled];
      }
      
      return allAnimals;
    } catch (err) {
      console.error("Error in getAnimals:", err);
      return [];
    }
  },

  /**
   * Fetch details for a specific animal
   */
  async getAnimalById(id) {
    if (!id) throw new Error('Animal id is required');

    // Instant lookup from cache if available and fresh
    const cached = animalCache.get(id);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    if (!supabase) throw new Error('Supabase not connected');
    
    const { data, error } = await supabase.from('animals').select('*').eq('id', id).single();
    if (error || !data) {
      throw new Error('Animal not found');
    }

    animalCache.set(id, { data, timestamp: Date.now() });
    return data;
  },

  /**
   * Get total sum of donations
   */
  async getDonationTotal() {
    if (!supabase) return 0;
    
    const { data, error } = await supabase
      .from('donations')
      .select('amount')
      .eq('status', 'completed');
      
    if (error) {
      console.error('Error fetching donation total:', error);
      return 0;
    }
    
    return data.reduce((sum, record) => sum + (record.amount || 0), 0) || 0;
  },

  /**
  getDefaultFoundations() {
    return [
      {
        id: 'f-soidog',
        full_name: 'มูลนิธิเพื่อสุนัขในซอย (Soi Dog Foundation)',
        phone: '076-681-029',
        address: '167/9 หมู่ 4 ต.ไม้ขาว อ.ถลาง จ.ภูเก็ต 83110',
        promptpay_number: '076681029'
      },
      {
        id: 'f-voice',
        full_name: 'มูลนิธิเดอะวอยซ์ (The Voice Foundation)',
        phone: '085-110-0055',
        address: 'แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110',
        promptpay_number: '0851100055'
      },
      {
        id: 'f-home4animals',
        full_name: 'มูลนิธิบ้านสงเคราะห์สัตว์พิการ',
        phone: '02-584-4896',
        address: '15/1 หมู่ 1 ซอยพระมหาการุณย์ 25 ต.บ้านใหม่ อ.ปากเกร็ด จ.นนทบุรี 11120',
        promptpay_number: '025844896'
      }
    ];
  },

  /**
   * Get all approved foundations for donation
   */
  async getFoundations() {
    if (!supabase) return this.getDefaultFoundations();
    try {
      // 1. ดึงจาก foundation_profiles เพื่อให้ได้ที่อยู่ เบอร์โทรพัสดุ และเบอร์พร้อมเพย์
      const { data: fpData, error: fpError } = await supabase
        .from('foundation_profiles')
        .select('id, foundation_name, address, contact_phone, promptpay_number')
        .eq('verification_status', 'approved');

      if (!fpError && fpData && fpData.length > 0) {
        return fpData.map(fp => ({
          id: fp.id,
          full_name: fp.foundation_name || 'มูลนิธิช่วยเหลือสัตว์',
          phone: fp.contact_phone || '',
          address: fp.address || 'กรุณาติดต่อสอบถามที่อยู่จัดส่งจากมูลนิธิโดยตรง',
          promptpay_number: fp.promptpay_number || (fp.contact_phone ? fp.contact_phone.replace(/\D/g, '') : '')
        }));
      }

      // 2. Fallback ไปที่ profiles ที่มี role = 'foundation' (ไม่ query foundation_status เพราะคอลัมน์นี้ไม่มีใน profiles)
      const { data: pData, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('role', 'foundation');
        
      if (!pError && pData && pData.length > 0) {
        return pData.map(p => ({
          id: p.id,
          full_name: p.full_name || 'มูลนิธิช่วยเหลือสัตว์',
          phone: p.phone || '',
          address: 'กรุณาติดต่อสอบถามที่อยู่จัดส่งจากมูลนิธิโดยตรง',
          promptpay_number: p.phone ? p.phone.replace(/\D/g, '') : ''
        }));
      }

      // 3. Fallback หากยังไม่มีข้อมูลในระบบ ให้ใช้มูลนิธิตั้งต้น
      return this.getDefaultFoundations();
    } catch (err) {
      console.warn('Error fetching foundations, using default foundations fallback:', err);
      return this.getDefaultFoundations();
    }
  },

  /**
   * Submit a swipe action (like, nope, superlike) to track user history
   */
  async submitSwipe(animalId, userId, action) {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000' || !supabase) return;
    
    try {
      const { error } = await supabase.from('swipes').upsert({
        user_id: userId,
        animal_id: animalId,
        action: action
      }, { onConflict: 'user_id,animal_id' });
      
      if (error) {
        console.error('Failed to record swipe in Supabase:', error.message);
      }
    } catch (err) {
      console.error('Error submitting swipe:', err);
    }
  },

  /**
   * Reset all swipes and matches for testing
   */
  async resetSwipes(userId) {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000' || !supabase) return;
    try {
      // Only delete swipes (left/right history) so animals show up again, 
      // but keep matches so the chat doesn't disappear.
      await supabase.from('swipes').delete().eq('user_id', userId);
    } catch (err) {
      console.error('Error resetting swipes:', err);
    }
  },

  /**
   * Get user preferences for filtering
   */
  async getUserPreferences(userId) {
    const defaultPrefs = { maxDistance: 50, animalType: 'all', gender: 'all' };
    if (!userId || userId === '00000000-0000-0000-0000-000000000000' || !supabase) {
      return defaultPrefs;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();
        
      if (!error && data && data.preferences) {
        return { ...defaultPrefs, ...data.preferences };
      }
    } catch (err) {
      console.error("Error getting preferences:", err);
    }
    return defaultPrefs;
  },

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId, preferences) {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000' || !supabase) {
      return;
    }
    
    try {
      await supabase
        .from('profiles')
        .update({ preferences })
        .eq('id', userId);
    } catch (err) {
      console.error("Error updating preferences:", err);
    }
  },

  /**
   * Submit a right swipe (match request)
   */
  /**
   * Fetch user verification details
   */
  async getUserVerification(userId) {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') return null;

    const cached = userVerifCache.get(userId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    if (!supabase) return null;

    try {
      const [verifRes, profileRes] = await Promise.all([
        supabase.from('user_verifications').select('*').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('id, full_name, phone, avatar_url').eq('id', userId).maybeSingle()
      ]);

      const verifData = verifRes?.data || {};
      const profData = profileRes?.data || {};

      if (!verifRes?.data && !profileRes?.data) return null;

      const result = {
        ...verifData,
        full_name: profData.full_name || verifData.full_name || 'ผู้ใช้งาน',
        phone: profData.phone || verifData.phone || '',
        avatar_url: profData.avatar_url || null
      };

      userVerifCache.set(userId, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      console.warn('Could not fetch user_verifications from Supabase:', err);
    }

    return null;
  },

  /**
   * Submit a right swipe (match request)
   */
  async submitMatchRequest(animalId, userId) {
    if (!supabase) throw new Error('Supabase not connected');
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') throw new Error('User not logged in');
    
    // Check for existing match first to prevent duplicates
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('user_id', userId)
      .eq('animal_id', animalId)
      .maybeSingle();
      
    if (existingMatch) {
      return {
        ...existingMatch,
        animalId: existingMatch.animal_id,
        lastMessage: existingMatch.last_message,
        timestamp: existingMatch.created_at ? new Date(existingMatch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'เพิ่งส่ง'
      };
    }

    const initialSummary = 'ส่งคำขอรับเลี้ยงและใบสมัครเรียบร้อยแล้ว';
    const newMatch = {
      animal_id: animalId,
      user_id: userId,
      status: 'pending',
      last_message: initialSummary,
      unread: 0
    };
    
    const { data, error } = await supabase.from('matches').insert(newMatch).select().single();
    if (error || !data) {
      console.error('Supabase match insert failed:', error?.message);
      throw new Error(error?.message || 'Match insert failed');
    }

    // Automatically send comprehensive Adoption Application and Assessment into the chat
    try {
      const [verification, animal, profileData] = await Promise.all([
        this.getUserVerification(userId),
        this.getAnimalById(animalId).catch(() => null),
        supabase.from('profiles').select('full_name, phone').eq('id', userId).maybeSingle().then(r => r?.data).catch(() => null)
      ]);

      const applicantName = verification?.full_name || profileData?.full_name || 'ผู้ขอรับเลี้ยง';
      const applicantPhone = verification?.phone || profileData?.phone || '-';
      const applicantIdCard = verification?.id_card_no 
        ? `${verification.id_card_no.slice(0, 1)}-${verification.id_card_no.slice(1, 5)}-${verification.id_card_no.slice(5, 10)}-${verification.id_card_no.slice(10, 12)}-${verification.id_card_no.slice(12)}` 
        : 'ยืนยันตัวตนแล้ว';
      const petName = animal?.name || 'สัตว์เลี้ยง';

      const asm = verification?.assessment || {};
      const q1 = asm.housing || 'มีบ้าน/คอนโดที่อนุญาตให้เลี้ยงสัตว์';
      const q2 = asm.time || 'มาก (อย่างน้อยวันละ 2 ครั้ง)';
      const q3 = asm.budget || 'มี (อย่างน้อย 1,000 บาท/เดือน)';
      const q4 = asm.family || 'เห็นด้วยทั้งหมด';
      const q5 = asm.longterm || 'พร้อม ดูแลตลอดชีวิต';

      const appMessageText = `[ใบสมัครขอรับเลี้ยงและผลประเมินความพร้อม]
━━━━━━━━━━━━━━━━━━
ผู้ขอรับเลี้ยง: ${applicantName}
เบอร์ติดต่อ: ${applicantPhone}
เลขบัตรประชาชน: ${applicantIdCard}
สถานะการยืนยันตัวตน: ผ่านการยืนยันตัวตนแล้ว (KYC Verified)

ผลแบบประเมินความพร้อมก่อนรับเลี้ยง:
1. ที่อยู่อาศัย: ${q1}
2. เวลาในการดูแล: ${q2}
3. งบประมาณต่อเดือน: ${q3}
4. ความเห็นชอบของครอบครัว: ${q4}
5. ความพร้อมดูแลระยะยาว: ${q5}
━━━━━━━━━━━━━━━━━━
มีความประสงค์ขอรับเลี้ยง ${petName} เพื่อให้เจ้าหน้าที่พิจารณาครับ/ค่ะ`;

      await supabase.from('messages').insert({
        match_id: data.id,
        sender: 'user',
        text: appMessageText
      });

      await supabase.from('matches').update({ last_message: `ใบสมัครขอรับเลี้ยง ${petName}` }).eq('id', data.id);
    } catch (msgErr) {
      console.warn('Could not auto-insert application message:', msgErr);
    }
    
    return {
      ...data,
      animalId: data.animal_id,
      lastMessage: `ใบสมัครขอรับเลี้ยง`,
      timestamp: data.created_at ? new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'เพิ่งส่ง'
    };
  },

  /**
   * Get all active matches and chats for the user
   */
  async getUserMatches(userId) {
    if (!supabase || !userId || userId === '00000000-0000-0000-0000-000000000000') return [];
    
    const { data, error } = await supabase
      .from('matches')
      .select('*, animal:animals(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (!error && data && data.length > 0) {
      return data.map(match => ({
        ...match,
        animalId: match.animal_id,
        lastMessage: match.last_message,
        timestamp: new Date(match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    }
    return [];
  },

  /**
   * Get all active matches and chats for the foundation
   */
  async getFoundationMatches(foundationId) {
    if (!supabase || !foundationId) return [];
    
    let matchesData = null;

    // 1. Try embedded query with animal
    const res1 = await supabase
      .from('matches')
      .select('*, animal:animals!inner(*)')
      .eq('animals.foundation_id', foundationId)
      .order('created_at', { ascending: false });

    if (!res1.error && res1.data && res1.data.length > 0) {
      matchesData = res1.data;
    } else {
      // 2. Try aliased filter syntax
      const res2 = await supabase
        .from('matches')
        .select('*, animal:animals!inner(*)')
        .eq('animal.foundation_id', foundationId)
        .order('created_at', { ascending: false });

      if (!res2.error && res2.data && res2.data.length > 0) {
        matchesData = res2.data;
      } else {
        // 3. Fallback: query foundation's animals directly then fetch matches
        try {
          const { data: myAnimals } = await supabase
            .from('animals')
            .select('id')
            .eq('foundation_id', foundationId);

          if (myAnimals && myAnimals.length > 0) {
            const animalIds = myAnimals.map(a => a.id);
            const res3 = await supabase
              .from('matches')
              .select('*, animal:animals(*)')
              .in('animal_id', animalIds)
              .order('created_at', { ascending: false });

            if (!res3.error && res3.data) {
              matchesData = res3.data;
            }
          }
        } catch (fErr) {
          console.warn('Fallback matches query failed:', fErr);
        }
      }
    }

    if (matchesData && matchesData.length > 0) {
      // Enrich matches with user verification and profile data
      const enriched = await Promise.all(matchesData.map(async match => {
        let userData = await this.getUserVerification(match.user_id);
        
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, full_name, phone, avatar_url')
            .eq('id', match.user_id)
            .maybeSingle();

          if (prof) {
            userData = {
              ...(userData || {}),
              full_name: prof.full_name || userData?.full_name || 'ผู้ใช้งาน',
              phone: prof.phone || userData?.phone || '',
              avatar_url: prof.avatar_url || null
            };
          }
        } catch (e) {
          console.warn('Error fetching profile in getFoundationMatches:', e);
        }

        let detectedLastSender = match.last_sender;
        if (!detectedLastSender && match.last_message) {
          if (match.last_message.startsWith('[ยืนยันการส่งมอบ') || 
              match.last_message.startsWith('[แจ้งผลการพิจารณา') || 
              match.last_message.startsWith('[แจ้งขอยกเลิก')) {
            detectedLastSender = 'shelter';
          } else if (match.last_message.startsWith('[ใบสมัครขอรับเลี้ยง') || 
                     match.last_message.startsWith('[ผู้ขอรับเลี้ยง')) {
            detectedLastSender = 'user';
          }
        }

        return {
          ...match,
          userData,
          animalId: match.animal_id,
          lastMessage: match.last_message,
          lastSender: detectedLastSender,
          last_sender: detectedLastSender,
          timestamp: new Date(match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }));

      return enriched;
    }
    return [];
  },

  /**
   * Get messages for a specific match
   */
  async getMessages(matchId) {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
      
    if (!error && data && data.length > 0) {
      return data.map(msg => ({
        ...msg,
        imageUrl: msg.image_url,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    }
    return [];
  },

  /**
   * Send a message to a match
   */
  async sendMessage(matchId, text, sender = 'user', imageUrl = null) {
    if (!supabase) throw new Error('Supabase not connected');
    
    const newMessage = {
      match_id: matchId,
      sender,
      text,
      image_url: imageUrl
    };
    
    const { data, error } = await supabase
      .from('messages')
      .insert(newMessage)
      .select()
      .single();
      
    if (error || !data) {
      console.error('Send message failed:', error?.message);
      throw new Error('Message insert failed');
    }

    // Update the match's last message, last sender, and unread flags
    try {
      const matchUpdate = {
        last_message: text || (imageUrl ? 'ส่งรูปภาพ' : ''),
        last_sender: sender,
        last_message_at: new Date().toISOString()
      };

      if (sender === 'shelter') {
        matchUpdate.unread = 1;
        matchUpdate.unread_user = 1;
        matchUpdate.unread_shelter = 0;
      } else {
        matchUpdate.unread = 1;
        matchUpdate.unread_shelter = 1;
        matchUpdate.unread_user = 0;
      }

      const { error: matchErr } = await supabase
        .from('matches')
        .update(matchUpdate)
        .eq('id', matchId);

      if (matchErr) {
        // Fallback without new columns
        await supabase
          .from('matches')
          .update({ last_message: text || (imageUrl ? 'ส่งรูปภาพ' : ''), unread: 1 })
          .eq('id', matchId);
      }
    } catch (err) {
      console.warn('Could not update match last_message:', err);
    }
      
    return {
      ...data,
      imageUrl: data.image_url,
      timestamp: data.created_at ? new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  },

  /**
   * Update match status (e.g. approve or reject)
   */
  async updateMatchStatus(matchId, status) {
    if (!supabase) throw new Error('Supabase not connected');
    
    const updatePayload = { 
      status,
      last_sender: 'shelter',
      last_message_at: new Date().toISOString()
    };
    if (status === 'approved' || status === 'rejected') {
      updatePayload.unread = 1;
      updatePayload.unread_user = 1;
      updatePayload.unread_shelter = 0;
    }

    try {
      const { data, error } = await supabase
        .from('matches')
        .update(updatePayload)
        .eq('id', matchId)
        .select()
        .single();
        
      if (!error && data) return data;

      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('matches')
        .update({ status, unread: (status === 'approved' || status === 'rejected') ? 1 : 0 })
        .eq('id', matchId)
        .select()
        .single();

      if (fallbackErr || !fallbackData) throw fallbackErr || new Error('Update match failed');
      return fallbackData;
    } catch (e) {
      console.error('Update match status failed:', e);
      throw new Error('Update match failed');
    }
  },

  /**
   * Mark a match as read by user or foundation
   */
  async markMatchAsRead(matchId, role = 'user', userId = null) {
    if (!matchId) return;

    // 1. Update localStorage immediately for instantaneous UI reaction
    try {
      const storageKey = (role === 'shelter' || role === 'foundation')
        ? (userId ? `read_chats_foundation_${userId}` : 'read_chats_foundation')
        : (userId ? `read_chats_${userId}` : 'read_chats_user');

      const readChats = JSON.parse(localStorage.getItem(storageKey) || '{}');
      readChats[matchId] = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(readChats));
      window.dispatchEvent(new Event('chatReadUpdated'));
    } catch (e) {}

    // 2. Clear unread flag in Supabase
    if (supabase) {
      try {
        const { error } = await supabase
          .from('matches')
          .update({ unread: 0 })
          .eq('id', matchId);

        if (error) {
          console.warn('Could not mark match as read in DB:', error.message);
        }
      } catch (err) {
        console.warn('Could not mark match as read in DB:', err);
      }
    }
  },

  /**
   * Report a user
   */
  async reportUser(reporterId, reportedId, reason, imageUrl = null) {
    if (!supabase) throw new Error('Supabase not connected');
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_id: reportedId,
        reason: reason,
        status: 'pending',
        image_url: imageUrl
      });
      
    if (error) {
      console.error('Failed to report user:', error.message);
      throw error;
    }
    return { success: true, data };
  },

  /**
   * Block a user
   */
  async blockUser(userId, blockedUserId) {
    if (!supabase) throw new Error('Supabase not connected');
    const { data, error } = await supabase
      .from('blocks')
      .insert({
        user_id: userId,
        blocked_id: blockedUserId
      });
      
    if (error) {
      console.error('Failed to block user:', error.message);
      throw error;
    }
    return { success: true, data };
  },

  /**
   * Ban a user (Admin only)
   */
  async banUser(userId) {
    if (!supabase) throw new Error('Supabase not connected');
    // Set is_banned to true in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_banned: true })
      .eq('id', userId);
      
    if (error) {
      console.error('Failed to ban user:', error.message);
      throw error;
    }
    
    // Also mark the report as resolved if we are calling this from a report
    return { success: true, data };
  },
  
  /**
   * Update report status (Admin only)
   */
  async updateReportStatus(reportId, status) {
    if (!supabase) return { success: true };
    
    const { data, error } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', reportId);
      
    if (error) throw error;
    return { success: true, data };
  },

  /**
   * Get match between two users
   */
  async getMatchBetweenUsers(userId1, userId2) {
    if (!supabase) return null;
    
    // Check if userId1 is user and userId2 is foundation
    const { data: data1 } = await supabase
      .from('matches')
      .select('id, animals!inner(foundation_id)')
      .eq('user_id', userId1)
      .eq('animals.foundation_id', userId2)
      .limit(1)
      .maybeSingle();
      
    if (data1) return { id: data1.id };

    // Check if userId2 is user and userId1 is foundation
    const { data: data2 } = await supabase
      .from('matches')
      .select('id, animals!inner(foundation_id)')
      .eq('user_id', userId2)
      .eq('animals.foundation_id', userId1)
      .limit(1)
      .maybeSingle();
      
    if (data2) return { id: data2.id };
    
    return null;
  },

  /**
   * Submit an incident report for stray/injured animals
   */
  async submitIncidentReport(reportData, imageFile = null) {
    let imageUrl = null;
    if (imageFile && supabase) {
      try {
        const fileExt = imageFile.name ? imageFile.name.split('.').pop() : 'jpg';
        const fileName = `incident_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('chat_images')
          .upload(fileName, imageFile);
          
        if (!uploadErr) {
          const { data } = supabase.storage.from('chat_images').getPublicUrl(fileName);
          imageUrl = data?.publicUrl || null;
        }
      } catch (err) {
        console.error('Failed to upload incident image:', err);
      }
    }

    if (!supabase) throw new Error('Supabase not connected');

    try {
      const payload = {
        user_id: reportData.userId || null,
        animal_type: reportData.animalType || 'dog',
        symptoms: reportData.symptoms,
        location_text: reportData.locationText,
        latitude: reportData.latitude || null,
        longitude: reportData.longitude || null,
        reporter_name: reportData.reporterName || null,
        reporter_phone: reportData.reporterPhone || null,
        image_url: imageUrl,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('incident_reports')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn('Incident insert warning (table might be newly created):', error.message);
        return { success: true, fallback: true };
      }
      return { success: true, data };
    } catch (err) {
      console.error('Failed to submit incident report to Supabase:', err);
      return { success: true, fallback: true };
    }
  },

  /**
   * Fetch incident rescue statistics (Real counts from database)
   */
  async getIncidentStats() {
    if (!supabase) {
      return { inProgress: 0, resolved: 0 };
    }

    try {
      // Try RPC function first for high performance and accurate count
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_incident_stats');
      if (!rpcError && rpcData) {
        return {
          inProgress: Number(rpcData.inProgress || 0),
          resolved: Number(rpcData.resolved || 0)
        };
      }

      // Fallback: direct table count query
      const { count: inProgressCount } = await supabase
        .from('incident_reports')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);

      const { count: resolvedCount } = await supabase
        .from('incident_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      return {
        inProgress: inProgressCount || 0,
        resolved: resolvedCount || 0
      };
    } catch (err) {
      console.warn('getIncidentStats fetch error:', err);
      return { inProgress: 0, resolved: 0 };
    }
  },

  /**
   * Fetch all incident reports with optional status filter
   */
  async getIncidentReports(statusFilter = 'all') {
    if (!supabase) return [];

    try {
      let query = supabase
        .from('incident_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('getIncidentReports error:', err);
      return [];
    }
  },

  /**
   * Update incident report status (pending -> in_progress -> resolved -> cancelled)
   * With rescuer dispatch locking and metadata
   */
  async updateIncidentStatus(reportId, newStatus, rescuerInfo = null) {
    if (!supabase) {
      return { success: true };
    }

    try {
      let payload = { status: newStatus };

      if (newStatus === 'in_progress') {
        if (rescuerInfo) {
          payload.rescuer_id = rescuerInfo.id || null;
          payload.rescuer_name = rescuerInfo.name || null;
          payload.rescuer_phone = rescuerInfo.phone || null;
          payload.accepted_at = new Date().toISOString();
        }
      } else if (newStatus === 'resolved') {
        payload.resolved_at = new Date().toISOString();
        if (rescuerInfo?.name) {
          payload.rescuer_name = rescuerInfo.name;
        }
      } else if (newStatus === 'pending') {
        // Relinquish / Release case back to pool
        payload.rescuer_id = null;
        payload.rescuer_name = null;
        payload.rescuer_phone = null;
        payload.accepted_at = null;
      }

      let res = await supabase
        .from('incident_reports')
        .update(payload)
        .eq('id', reportId)
        .select();

      // Fallback: If database hasn't applied migration 011 yet, fallback to updating just status
      if (res.error && res.error.message && (res.error.message.includes('column') || res.error.message.includes('rescuer'))) {
        console.warn('Fallback update without dispatch columns:', res.error.message);
        res = await supabase
          .from('incident_reports')
          .update({ status: newStatus })
          .eq('id', reportId)
          .select();
      }

      if (res.error) throw res.error;
      if (!res.data || res.data.length === 0) {
        throw new Error('ไม่สามารถอัปเดตข้อมูลได้ เนื่องจากสิทธิ์ในฐานข้อมูล (RLS Policy) ยังไม่อนุญาตให้บัญชีนี้แก้ไขเคส');
      }
      return { success: true, data: res.data[0] };
    } catch (err) {
      console.error('updateIncidentStatus error:', err);
      throw err;
    }
  },

  /**
   * Upload donation slip
   */
  async uploadDonationSlip(slipFile) {
    if (!slipFile || !supabase) return null;
    try {
      const fileExt = slipFile.name.split('.').pop();
      const fileName = `slip_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error } = await supabase.storage
        .from('chat_images')
        .upload(fileName, slipFile);
        
      if (error) throw error;
      const { data } = supabase.storage.from('chat_images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading donation slip:', err);
      return null;
    }
  },

  /**
   * Update donation verification status (approve/reject slip)
   */
  async updateDonationStatus(donationId, newStatus) {
    if (!supabase) throw new Error('Supabase not connected');
    const { data, error } = await supabase
      .from('donations')
      .update({ status: newStatus })
      .eq('id', donationId)
      .select();

    if (error) throw error;
    return data;
  },

  // รายการสิ่งของจำเป็นเริ่มต้น (Fallback)
  defaultNeeds: [
    { id: 'def-1', item_name: 'อาหารเม็ดสำหรับสุนัขโต', category: 'food', urgency: 'critical', note: 'ต้องการสูตรโภชนาการสำหรับสุนัขโตทุกสายพันธุ์' },
    { id: 'def-2', item_name: 'อาหารเปียกและนมลูกแมว', category: 'food', urgency: 'high', note: 'สำหรับลูกแมวแรกเกิดและแมวป่วยพักฟื้น' },
    { id: 'def-3', item_name: 'แผ่นรองซับสิ่งขับถ่าย Size L', category: 'hygiene', urgency: 'high', note: 'แบบดูดซึมไวเพื่อความสะอาดในกรงพักฟื้น' },
    { id: 'def-4', item_name: 'ยาป้องกันพยาธิหัวใจและเห็บหมัด', category: 'medical', urgency: 'normal', note: 'ชนิดหยดหลังคอหรือชนิดเม็ดเคี้ยว' },
    { id: 'def-5', item_name: 'ทรายแมวเต้าหู้หรือเบนโทไนท์', category: 'hygiene', urgency: 'normal', note: 'แบบฝุ่นน้อย ปลอดภัยต่อระบบทางเดินหายใจ' }
  ],

  /**
   * Fetch needs items for a specific foundation or all
   */
  async getFoundationNeeds(foundationId) {
    if (!supabase) return this.defaultNeeds;

    try {
      let query = supabase
        .from('foundation_needs')
        .select('*')
        .eq('is_active', true);

      if (foundationId) {
        query = query.eq('foundation_id', foundationId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.warn('Error fetching foundation_needs, using fallback:', error.message);
        return this.defaultNeeds;
      }

      if (!data || data.length === 0) {
        return this.defaultNeeds;
      }

      return data;
    } catch (err) {
      console.warn('Exception fetching foundation_needs:', err);
      return this.defaultNeeds;
    }
  },

  /**
   * Add a new need item (by foundation)
   */
  async addFoundationNeed(needData) {
    if (!supabase) throw new Error('Supabase not connected');
    const { data, error } = await supabase
      .from('foundation_needs')
      .insert([needData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing need item
   */
  async updateFoundationNeed(id, needData) {
    if (!supabase) throw new Error('Supabase not connected');
    const { data, error } = await supabase
      .from('foundation_needs')
      .update(needData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a need item
   */
  async deleteFoundationNeed(id) {
    if (!supabase) throw new Error('Supabase not connected');
    const { error } = await supabase
      .from('foundation_needs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Upload a photo for adoption follow-up report
   */
  async uploadFollowupPhoto(file) {
    if (!file || !supabase) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `followup_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('chat_images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('chat_images')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Error uploading followup photo:', err);
      // Fallback: create base64 data url if storage fails
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }
  },

  /**
   * Confirm adoption handover (ตกลงรับเลี้ยงสำเร็จ)
   */
  async confirmAdoptionHandover(matchId, handoverDate = null, notes = '') {
    if (!supabase) throw new Error('Supabase not connected');
    const finalHandoverDate = handoverDate || new Date().toISOString();

    // 1. Get match and animal info
    let animalId = null;
    let petName = 'สัตว์เลี้ยง';

    try {
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .maybeSingle();

      if (match) {
        animalId = match.animal_id || match.animalId;
        if (animalId) {
          const { data: pet } = await supabase
            .from('animals')
            .select('name')
            .eq('id', animalId)
            .maybeSingle();
          if (pet?.name) petName = pet.name;
        }
      }
    } catch (e) {
      console.warn('Could not fetch pet name for handover announcement:', e);
    }

    // 2. Update match status to adopted / completed
    try {
      const { error: updateMatchErr } = await supabase
        .from('matches')
        .update({
          status: 'adopted',
          handover_date: finalHandoverDate,
          adoption_notes: notes || null,
          last_sender: 'shelter',
          last_message_at: new Date().toISOString(),
          unread: 1,
          unread_user: 1,
          unread_shelter: 0
        })
        .eq('id', matchId);

      if (updateMatchErr) {
        console.warn('Fallback updating status without handover_date column:', updateMatchErr.message);
        await supabase.from('matches').update({ status: 'adopted', unread: 1 }).eq('id', matchId);
      }
    } catch (err) {
      console.warn('Error updating match status to adopted:', err);
      await supabase.from('matches').update({ status: 'adopted', unread: 1 }).eq('id', matchId);
    }

    // Cache fallback in localStorage
    try {
      localStorage.setItem(`handover_date_${matchId}`, finalHandoverDate);
      if (notes) localStorage.setItem(`adoption_notes_${matchId}`, notes);
    } catch (e) {}

    // 3. Update animal status to 'adopted'
    if (animalId) {
      animalCache.delete(animalId);
      try {
        await supabase
          .from('animals')
          .update({ status: 'adopted' })
          .eq('id', animalId);
      } catch (aErr) {
        console.warn('Error updating animal status to adopted:', aErr);
      }
    }

    // 4. Automatically post system announcement in chat
    try {
      const announceText = `[ยืนยันการส่งมอบสัตว์เลี้ยงสำเร็จ]
━━━━━━━━━━━━━━━━━━
ยินดีด้วยครับ/ค่ะ! การส่งมอบ ${petName} เสร็จสมบูรณ์แล้ว
น้องได้เริ่มต้นชีวิตใหม่ที่อบอุ่นกับครอบครัวใหม่แล้ว

ระบบได้เริ่มการติดตามสถานะสุขภาวะของน้อง (ทุกๆ 2 เดือน)
ผู้รับเลี้ยงสามารถกดปุ่ม "ติดตามสถานะการรับเลี้ยง" ด้านบน เพื่อส่งอัปเดตสุขภาพและรูปถ่ายของน้องให้ทางมูลนิธิทราบได้ตลอดเวลา
━━━━━━━━━━━━━━━━━━`;

      await this.sendMessage(matchId, announceText, 'shelter');
    } catch (msgErr) {
      console.warn('Error sending handover announcement:', msgErr);
    }

    return { success: true, handoverDate: finalHandoverDate };
  },

  /**
   * Get all adoption follow-up records and computed 2-month milestones
   */
  async getAdoptionFollowups(matchId) {
    if (!matchId) return { followups: [], milestones: [], nextDue: null };

    let followups = [];
    let matchData = null;

    if (supabase) {
      try {
        const { data: mData } = await supabase
          .from('matches')
          .select('*, animal:animals(*)')
          .eq('id', matchId)
          .maybeSingle();
        matchData = mData;

        const { data, error } = await supabase
          .from('adoption_followups')
          .select('*')
          .eq('match_id', matchId)
          .order('milestone_index', { ascending: true });

        if (!error && data) {
          followups = data;
        }
      } catch (err) {
        console.warn('Error fetching adoption_followups:', err);
      }
    }

    // Local storage fallback cache
    try {
      const localKey = `followups_${matchId}`;
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Merge without duplicates
        const existingIds = new Set(followups.map(f => f.id || f.milestone_index));
        parsed.forEach(item => {
          if (!existingIds.has(item.id || item.milestone_index)) {
            followups.push(item);
          }
        });
      }
    } catch (e) {}

    // Compute standardized 2-month milestone timeline schedule
    const baseDate = matchData?.handover_date ? new Date(matchData.handover_date) : (matchData?.created_at ? new Date(matchData.created_at) : new Date());
    const now = new Date();

    const milestones = [];
    const totalMilestones = Math.max(4, followups.length + 1);

    for (let i = 1; i <= totalMilestones; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + (i * 2));

      const submission = followups.find(f => f.milestone_index === i);
      const isSubmitted = !!submission;
      const isOverdue = !isSubmitted && now > dueDate;
      const diffMs = dueDate - now;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isDue = isOverdue || daysRemaining <= 7;
      const isOpenForSubmission = !isSubmitted && isDue;
      const daysUntilOpen = Math.max(0, daysRemaining - 7);

      milestones.push({
        milestoneIndex: i,
        milestoneLabel: `ครั้งที่ ${i} (ครบ ${i * 2} เดือน)`,
        dueDate: dueDate.toISOString(),
        isSubmitted,
        isOverdue,
        isDue,
        isOpenForSubmission,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        daysOverdue: isOverdue ? daysOverdue : 0,
        daysUntilOpen,
        submission: submission || null
      });
    }

    // Determine the next due milestone
    const nextDue = milestones.find(m => !m.isSubmitted) || null;
    const allSubmitted = milestones.length > 0 && milestones.every(m => m.isSubmitted);
    const isDueForSubmission = nextDue ? nextDue.isOpenForSubmission : false;

    return {
      followups,
      milestones,
      nextDue,
      allSubmitted,
      isDueForSubmission,
      match: matchData
    };
  },

  /**
   * Submit an adoption follow-up report (with photos and health assessment)
   */
  async submitAdoptionFollowup(followupData) {
    if (!followupData.match_id) throw new Error('match_id is required');

    const payload = {
      match_id: followupData.match_id,
      animal_id: String(followupData.animal_id || ''),
      user_id: followupData.user_id,
      foundation_id: followupData.foundation_id || null,
      milestone_index: followupData.milestone_index || 1,
      milestone_label: followupData.milestone_label || `ครั้งที่ ${followupData.milestone_index || 1} (ครบ ${(followupData.milestone_index || 1) * 2} เดือน)`,
      due_date: followupData.due_date || new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      photos: followupData.photos || [],
      health_status: followupData.health_status || 'แข็งแรงดี',
      vaccine_status: followupData.vaccine_status || 'ครบแล้ว',
      neutered_status: followupData.neutered_status || 'แล้ว',
      food_status: followupData.food_status || 'กินอาหารเม็ด + อาหารเปียก',
      behavior_status: followupData.behavior_status || 'ปรับตัวได้ดี ร่าเริง',
      notes: followupData.notes || '',
      is_reviewed: false
    };

    let resultData = { ...payload, id: `local_${Date.now()}` };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('adoption_followups')
          .insert([payload])
          .select()
          .single();

        if (!error && data) {
          resultData = data;
        } else if (error) {
          console.warn('Supabase insert adoption_followups error, saving locally:', error.message);
        }
      } catch (err) {
        console.warn('Exception inserting adoption_followups:', err);
      }
    }

    // Save to local cache
    try {
      const localKey = `followups_${followupData.match_id}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      existing.push(resultData);
      localStorage.setItem(localKey, JSON.stringify(existing));
    } catch (e) {}

    // Post update announcement to chat room
    try {
      const summaryText = `[ส่งรายงานติดตามสถานะน้อง: ${payload.milestone_label}]
━━━━━━━━━━━━━━━━━━
ผู้รับเลี้ยงได้ส่งภาพถ่ายและอัปเดตสุขภาพล่าสุดเรียบร้อยแล้ว:
• สุขภาพทั่วไป: ${payload.health_status}
• วัคซีน: ${payload.vaccine_status}
• ทำหมัน: ${payload.neutered_status}
• อาหาร: ${payload.food_status}
• พฤติกรรม: ${payload.behavior_status}
${payload.notes ? `• บันทึกเพิ่มเติม: ${payload.notes}\n` : ''}
เจ้าหน้าที่มูลนิธิสามารถกดปุ่ม "ประวัติการติดตาม" เพื่อตรวจสอบภาพถ่ายและผลประเมินฉบับเต็มได้ครับ/ค่ะ
━━━━━━━━━━━━━━━━━━`;

      const firstPhoto = payload.photos?.[0] || null;
      await this.sendMessage(followupData.match_id, summaryText, 'user', firstPhoto);
    } catch (msgErr) {
      console.warn('Error sending followup chat message:', msgErr);
    }

    return resultData;
  },

  /**
   * Review an adoption follow-up milestone (by Foundation)
   */
  async reviewAdoptionFollowup(followupId, matchId) {
    if (supabase && !followupId.startsWith('local_')) {
      try {
        await supabase
          .from('adoption_followups')
          .update({ is_reviewed: true, reviewed_at: new Date().toISOString() })
          .eq('id', followupId);
      } catch (err) {
        console.warn('Error reviewing followup in Supabase:', err);
      }
    }

    // Update local cache
    try {
      const localKey = `followups_${matchId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const updated = existing.map(item => item.id === followupId ? { ...item, is_reviewed: true, reviewed_at: new Date().toISOString() } : item);
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch (e) {}

    return { success: true };
  },

  /**
   * Send a reminder into chat for overdue follow-up
   */
  async sendFollowupReminder(matchId, milestoneLabel = 'รอบถัดไป') {
    const reminderText = `[แจ้งเตือนกำหนดส่งอัปเดตสถานะน้อง (${milestoneLabel})]
━━━━━━━━━━━━━━━━━━
สวัสดีครับ/ค่ะ ทางมูลนิธิขอสอบถามความเป็นอยู่และสุขภาวะของน้อง
รบกวนผู้รับเลี้ยงช่วยอัปเดตรูปถ่ายและสถานะการดูแลล่าสุดให้น้องผ่านปุ่ม "ติดตามสถานะการรับเลี้ยง" ด้วยนะครับ/ค่ะ

เพื่อความปลอดภัยและสุขภาวะที่ดีของน้อง ขอบคุณมากครับ/ค่ะ`;

    await this.sendMessage(matchId, reminderText, 'shelter');
    return { success: true };
  }
};

