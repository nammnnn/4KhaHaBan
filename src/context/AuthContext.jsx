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

  // ดึง profile + foundation status จากฐานข้อมูล (ไม่ใช้ localStorage fallback)
  const fetchProfile = async (currentUser) => {
    if (!supabase || !currentUser) return;

    try {
      // ดึง profile หลัก
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('[Auth] ดึง profile ไม่สำเร็จ:', profileError);
      }

      const currentRole = profileData?.role || 'user';
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
        
        // ถ้าเป็น user ทั่วไป เช็คการยืนยันตัวตน
        const { data: verifyData, error: verifyError } = await supabase
          .from('user_verifications')
          .select('status')
          .eq('id', currentUser.id)
          .maybeSingle();
          
        if (verifyData) {
          setUserVerificationStatus(verifyData.status);
        } else {
          setUserVerificationStatus(null);
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

      if (supabase) {
        const { error } = await supabase.from('user_verifications').upsert(payload);
        if (error) {
          console.error('[Auth] verifyUser Supabase error:', error);
          return { error };
        }
      }
      
      setUserVerificationStatus('verified');
      // Sync basic profile fields
      if (verificationData.full_name || verificationData.phone) {
        await updateProfile({
          full_name: verificationData.full_name,
          phone: verificationData.phone
        });
      }

      return { success: true };
    } catch (err) {
      console.error('[Auth] verifyUser error:', err);
      return { error: err };
    }
  };

  // getUserVerificationData — ดึงข้อมูล KYC และแบบประเมินความพร้อม
  const getUserVerificationData = async (targetUserId) => {
    const uid = targetUserId || user?.id;
    if (!uid || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.error('[Auth] getUserVerificationData error:', err);
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
    if (!supabase) return;
    return await supabase.auth.signOut();
  };

  const updateProfile = async (updates) => {
    if (!user) return { error: new Error('User not logged in') };
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();
        if (error) throw error;
        setProfile(data);

        // Keep auth user_metadata in sync as well
        const metaUpdates = {};
        if (updates.avatar_url) metaUpdates.avatar_url = updates.avatar_url;
        if (updates.full_name) metaUpdates.full_name = updates.full_name;
        if (Object.keys(metaUpdates).length > 0) {
          await supabase.auth.updateUser({ data: metaUpdates }).catch(err => {
            console.warn('[Auth] Could not sync user_metadata:', err);
          });
        }

        return { success: true, data };
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
