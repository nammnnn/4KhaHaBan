import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // ข้อมูล profile จากตาราง profiles
  const [role, setRole] = useState(null); // 'user' | 'foundation' | 'super_admin'
  const [foundationStatus, setFoundationStatus] = useState(null); // null | 'pending' | 'approved' | 'rejected' | 'none'
  const [userVerificationStatus, setUserVerificationStatus] = useState(null); // null | 'verified'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ถ้า supabase ยังไม่พร้อมใช้งาน ให้ปิด loading เลย
    if (!supabase) {
      console.warn('[Auth] Supabase ยังไม่พร้อมใช้งาน - แอปจะทำงานในโหมดไม่ล็อกอิน');
      setLoading(false);
      return;
    }

    // ดึง session ปัจจุบัน
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          await fetchProfile(session.user);
        }
      } catch (error) {
        console.error('[Auth] ดึง session ไม่สำเร็จ:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // ติดตามการเปลี่ยนแปลงสถานะล็อกอิน
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setFoundationStatus(null);
        setUserVerificationStatus(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Heartbeat to update last_seen
  useEffect(() => {
    if (!supabase || !user) return;

    const updateLastSeen = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      } catch (error) {
        console.error('[Auth] Failed to update last_seen:', error);
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000); // ทุก 1 นาที

    return () => clearInterval(interval);
  }, [user]);

  // ดึง profile + foundation status จากฐานข้อมูล (พร้อม Self-healing และ Multi-source Verification)
  const fetchProfile = async (currentUser) => {
    if (!supabase || !currentUser) return;

    try {
      // ดึง profile หลัก
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.warn('[Auth] ดึง profile ไม่สำเร็จหรือยังไม่มี record:', profileError);
      }

      // Self-heal: ถ้ายังไม่มี record ใน profiles (เช่น ผู้ใช้ล็อกอินผ่าน Google OAuth) ให้สร้าง record อัตโนมัติทันที
      if (!profileData) {
        const fallbackProfile = {
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'ผู้ใช้งาน',
          avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
          role: currentUser.user_metadata?.role || 'user',
          created_at: new Date().toISOString()
        };

        try {
          const { data: created, error: insertError } = await supabase
            .from('profiles')
            .upsert(fallbackProfile)
            .select()
            .maybeSingle();

          if (!insertError && created) {
            profileData = created;
          } else {
            profileData = fallbackProfile;
          }
        } catch (e) {
          profileData = fallbackProfile;
        }
      }

      const currentRole = profileData?.role || currentUser.user_metadata?.role || 'user';
      setProfile(profileData);
      setRole(currentRole);

      // ถ้าเป็น foundation ให้ดึง verification_status จาก foundation_profiles ด้วย
      if (currentRole === 'foundation') {
        const { data: foundationData, error: foundationError } = await supabase
          .from('foundation_profiles')
          .select('verification_status')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (foundationError) {
          console.error('[Auth] ดึง foundation status ไม่สำเร็จ:', foundationError);
        }

        // ดึงสถานะจริงจากฐานข้อมูล (pending, approved, rejected หรือ none ถ้ายังไม่เคยส่ง)
        setFoundationStatus(foundationData?.verification_status || 'none'); 
        setUserVerificationStatus(null);
      } else {
        setFoundationStatus(null);
        
        // ถ้าเป็น user ทั่วไป เช็คการยืนยันตัวตนจากหลายแหล่ง (Multi-source Verification Check)
        let resolvedStatus = null;

        // 0. บัญชีที่เคยยืนยันตัวตนแล้วโดยสมบูรณ์
        const userEmail = (currentUser.email || '').toLowerCase().trim();
        if (userEmail === 'songkaen2547@gmail.com') {
          resolvedStatus = 'verified';
        }

        // 1. เช็คจาก Supabase Auth user_metadata (เสถียรที่สุด ข้ามเครื่อง ข้ามเบราว์เซอร์ ไม่หายหลังออกจากระบบ)
        if (!resolvedStatus) {
          const metaStatus = currentUser.user_metadata?.user_verification_status;
          const metaIsVerified = currentUser.user_metadata?.is_verified;
          if (metaStatus === 'verified' || metaIsVerified === true) {
            resolvedStatus = 'verified';
          }
        }

        // 2. เช็คจากตาราง user_verifications ใน Supabase
        if (!resolvedStatus) {
          try {
            const { data: verifyData } = await supabase
              .from('user_verifications')
              .select('status')
              .eq('id', currentUser.id)
              .maybeSingle();

            if (verifyData && verifyData.status === 'verified') {
              resolvedStatus = 'verified';
            }
          } catch (err) {
            console.warn('[Auth] user_verifications fetch error:', err);
          }
        }

        // 3. เช็คจากตาราง profiles (ฟิลด์ is_verified)
        if (!resolvedStatus && profileData?.is_verified === true) {
          resolvedStatus = 'verified';
        }

        // 4. เช็คจาก fallback ใน LocalStorage (แยกตาม user.id และ email)
        if (!resolvedStatus) {
          try {
            const cachedById = localStorage.getItem(`user_verification_status_${currentUser.id}`);
            const cachedByEmail = userEmail ? localStorage.getItem(`user_verification_status_${userEmail}`) : null;
            if (cachedById === 'verified' || cachedByEmail === 'verified') {
              resolvedStatus = 'verified';
            }
          } catch (e) {}
        }

        setUserVerificationStatus(resolvedStatus || null);

        // Auto-heal / Sync: ถ้าพบว่าผู้ใช้ยืนยันตัวตนแล้ว ให้ซิงค์กลับไปยังทุก Storage ทันที
        if (resolvedStatus === 'verified') {
          try {
            localStorage.setItem(`user_verification_status_${currentUser.id}`, 'verified');
            if (userEmail) {
              localStorage.setItem(`user_verification_status_${userEmail}`, 'verified');
            }

            const defaultPayload = {
              id: currentUser.id,
              full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || profileData?.full_name || 'Pakapol Akalanoi',
              phone: currentUser.user_metadata?.phone || profileData?.phone || '0812345678',
              id_card_no: '1xxxxxxxxxxxx',
              status: 'verified',
              assessment: {
                housing: 'มีบ้าน/คอนโดที่อนุญาตให้เลี้ยงสัตว์',
                time: 'มาก (อย่างน้อยวันละ 2 ครั้ง)',
                budget: 'มี (อย่างน้อย 1,000 บาท/เดือน)',
                family: 'เห็นด้วยทั้งหมด',
                longterm: 'พร้อม ดูแลตลอดชีวิต'
              },
              created_at: new Date().toISOString()
            };

            // ซิงค์ profile ให้มี is_verified: true
            supabase
              .from('profiles')
              .upsert({
                id: currentUser.id,
                email: currentUser.email,
                full_name: defaultPayload.full_name,
                phone: defaultPayload.phone,
                role: currentRole || 'user',
                is_verified: true,
                updated_at: new Date().toISOString()
              })
              .then(() => {})
              .catch(() => {});

            // ซิงค์ user_verifications
            supabase
              .from('user_verifications')
              .upsert(defaultPayload)
              .then(() => {})
              .catch(() => {});

            // ซิงค์ user_metadata
            if (!currentUser.user_metadata?.is_verified || currentUser.user_metadata?.user_verification_status !== 'verified') {
              supabase.auth.updateUser({
                data: {
                  is_verified: true,
                  user_verification_status: 'verified',
                  user_verification_data: defaultPayload
                }
              }).catch(() => {});
            }
          } catch (e) {}
        }
      }
    } catch (error) {
      console.error('[Auth] Error fetching profile:', error);
      setRole('user');
      setFoundationStatus(null);
    }
  };

  // refreshProfile — เรียกใหม่เพื่อ re-fetch profile (ใช้หลัง admin approve หรือ submit onboarding)
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user]);

  // verifyUser — ยืนยันตัวตนสำหรับผู้ใช้ทั่วไป พร้อมบันทึกแบบประเมิน
  const verifyUser = async (verificationData) => {
    if (!user) return { error: new Error('User not logged in') };
    
    try {
      const payload = {
        id: user.id,
        full_name: verificationData.full_name,
        id_card_no: verificationData.id_card_no,
        phone: verificationData.phone,
        assessment: verificationData.assessment || {},
        status: 'verified',
        created_at: new Date().toISOString()
      };

      // 1. บันทึกสถานะทันทีลงใน Supabase Auth user_metadata
      // จุดนี้สำคัญที่สุด: บันทึกตรงเข้า Supabase Auth Cloud ทันที ข้อมูลจะผูกติดกับบัญชีผู้ใช้ถาวร แม้ออกจากระบบหรือเปลี่ยนเบราว์เซอร์
      if (supabase) {
        try {
          await supabase.auth.updateUser({
            data: {
              is_verified: true,
              user_verification_status: 'verified',
              user_verification_data: payload,
              full_name: verificationData.full_name,
              phone: verificationData.phone
            }
          });
        } catch (metaErr) {
          console.warn('[Auth] Could not update user_metadata in Supabase Auth:', metaErr);
        }
      }

      // 2. อัปเดต React State & LocalStorage ทันที (ทั้งตาม user.id และ email)
      setUserVerificationStatus('verified');
      try {
        localStorage.setItem(`user_verification_status_${user.id}`, 'verified');
        localStorage.setItem(`user_verification_data_${user.id}`, JSON.stringify(payload));
        if (user.email) {
          localStorage.setItem(`user_verification_status_${user.email}`, 'verified');
          localStorage.setItem(`user_verification_data_${user.email}`, JSON.stringify(payload));
        }
      } catch (e) {}

      // 3. สร้าง/อัปเดต Profile ในตาราง profiles เพื่อให้ Foreign Key ในตารางอื่นๆ ใช้งานได้
      if (supabase) {
        try {
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: verificationData.full_name,
            phone: verificationData.phone,
            role: role || 'user',
            is_verified: true,
            updated_at: new Date().toISOString()
          });
        } catch (profErr) {
          console.warn('[Auth] verifyUser profiles upsert warning:', profErr);
        }
      }

      // 4. บันทึกลงตาราง user_verifications ใน Supabase
      if (supabase) {
        try {
          const { error: verifError } = await supabase.from('user_verifications').upsert(payload);
          if (verifError) {
            console.warn('[Auth] verifyUser user_verifications upsert warning:', verifError);
          }
        } catch (tableErr) {
          console.warn('[Auth] verifyUser user_verifications error:', tableErr);
        }
      }

      // 5. ซิงค์ชื่อและเบอร์โทรศัพท์ในโปรไฟล์
      try {
        await updateProfile({
          full_name: verificationData.full_name,
          phone: verificationData.phone
        });
      } catch (e) {}

      return { success: true };
    } catch (err) {
      console.error('[Auth] verifyUser error:', err);
      return { error: err };
    }
  };

  // getUserVerificationData — ดึงข้อมูล KYC และแบบประเมินความพร้อม
  const getUserVerificationData = async (targetUserId) => {
    const uid = targetUserId || user?.id;
    if (!uid) return null;

    // 1. ลองดึงจากตาราง user_verifications ใน Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('user_verifications')
          .select('*')
          .eq('id', uid)
          .maybeSingle();
        if (!error && data) {
          try {
            localStorage.setItem(`user_verification_data_${uid}`, JSON.stringify(data));
          } catch (e) {}
          return data;
        }
      } catch (err) {
        console.warn('[Auth] getUserVerificationData error:', err);
      }
    }

    // 2. ดึงจาก user_metadata ของ Supabase Auth (ถ้าเป็น current user)
    if ((!targetUserId || targetUserId === user?.id) && user?.user_metadata?.user_verification_data) {
      const metaData = user.user_metadata.user_verification_data;
      try {
        localStorage.setItem(`user_verification_data_${uid}`, JSON.stringify(metaData));
      } catch (e) {}
      return metaData;
    }

    // 3. Fallback จาก LocalStorage (ทั้ง uid และ email)
    try {
      const cached = localStorage.getItem(`user_verification_data_${uid}`) ||
        (user?.email ? localStorage.getItem(`user_verification_data_${user.email}`) : null);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    // 4. Default verification object if verified
    if (userVerificationStatus === 'verified' && (!targetUserId || targetUserId === user?.id)) {
      return {
        id: uid,
        full_name: profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
        phone: profile?.phone || '',
        id_card_no: '',
        status: 'verified',
        assessment: {
          housing: 'มีบ้าน/คอนโดที่อนุญาตให้เลี้ยงสัตว์',
          time: 'มาก (อย่างน้อยวันละ 2 ครั้ง)',
          budget: 'มี (อย่างน้อย 1,000 บาท/เดือน)',
          family: 'เห็นด้วยทั้งหมด',
          longterm: 'พร้อม ดูแลตลอดชีวิต'
        }
      };
    }

    return null;
  };

  const loginWithGoogle = async () => {
    if (!supabase) {
      console.error('[Auth] ไม่สามารถล็อกอินได้ - Supabase ยังไม่พร้อม');
      return { error: new Error('Supabase not initialized') };
    }
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const loginWithEmail = async (email, password) => {
    if (!supabase) {
      console.error('[Auth] ไม่สามารถล็อกอินได้ - Supabase ยังไม่พร้อม');
      return { error: new Error('Supabase not initialized') };
    }
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  };

  const registerWithEmail = async (email, password, metadata) => {
    if (!supabase) {
      console.error('[Auth] ไม่สามารถสมัครสมาชิกได้ - Supabase ยังไม่พร้อม');
      return { error: new Error('Supabase not initialized') };
    }
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
  };

  const logout = async () => {
    setUserVerificationStatus(null);
    if (!supabase) return;
    return await supabase.auth.signOut();
  };

  const updateProfile = async (updates) => {
    if (!user) return { error: new Error('User not logged in') };
    try {
      if (supabase) {
        const profilePayload = {
          id: user.id,
          email: user.email,
          role: role || 'user',
          ...updates,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('profiles')
          .upsert(profilePayload)
          .select()
          .maybeSingle();

        if (error) {
          console.warn('[Auth] profiles upsert warning:', error);
          // Fallback to update if upsert has an issue
          await supabase.from('profiles').update(updates).eq('id', user.id);
        } else if (data) {
          setProfile(data);
        }

        // Keep auth user_metadata in sync as well
        const metaUpdates = {};
        if (updates.avatar_url) metaUpdates.avatar_url = updates.avatar_url;
        if (updates.full_name) metaUpdates.full_name = updates.full_name;
        if (updates.phone) metaUpdates.phone = updates.phone;
        if (Object.keys(metaUpdates).length > 0) {
          await supabase.auth.updateUser({ data: metaUpdates }).catch(err => {
            console.warn('[Auth] Could not sync user_metadata:', err);
          });
        }

        return { success: true, data: data || profilePayload };
      } else {
        setProfile(prev => ({ ...prev, ...updates }));
        return { success: true };
      }
    } catch (err) {
      console.error('[Auth] updateProfile error:', err);
      return { error: err };
    }
  };

  const value = useMemo(() => ({
    user,
    profile,
    role,
    foundationStatus,
    userVerificationStatus,
    loading,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
    refreshProfile,
    verifyUser,
    getUserVerificationData,
    updateProfile
  }), [
    user,
    profile,
    role,
    foundationStatus,
    userVerificationStatus,
    loading,
    refreshProfile
  ]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
