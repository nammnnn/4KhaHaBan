import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
  User, LogOut, Edit3, ChevronRight,
  Heart, Settings, MessageCircle, Shield,
  Award, Sparkles, Mail, Camera, PawPrint, ClipboardList, Users, FileWarning,
  Building2, PiggyBank, ShieldCheck, MessageSquare, Briefcase, X, Loader, CheckCircle, Phone, MapPin, Search, ExternalLink,
  CheckCircle2, ArrowRight, FileText, AlertCircle, Eye, Languages, HelpCircle, Lock, Trash2
} from 'lucide-react';
import { searchCoordinatesFromAddress, getAddressFromCoordinates, parseCoordinatesFromText } from '../lib/geo';
import InteractiveLocationPicker from '../components/InteractiveLocationPicker';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import { loadSavedLocation } from '../lib/geo';
import { Badge, Button, Dialog, Field, useToast } from '../components/ui';
import { ProfileSection, InfoRow, AdoptionRequests, FaqList } from '../components/profile/ProfileSections';
import { useI18n, LanguageSwitch } from '../i18n';
import '../components/profile/ProfileSections.css';
import { MOTION } from '../lib/motion';

// Small Google "G" so "Linked to Google" reads at a glance
function GoogleMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

export default function UserProfile() {
  const { user, profile, role, foundationStatus, userVerificationStatus, logout, updateProfile, changeEmail } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const { matches } = useAppContext();
  const [searchParams] = useSearchParams();
  const [searchPrefs, setSearchPrefs] = useState(null);
  const [imgError, setImgError] = useState(false);
  
  // Settings Modal states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  // Change email (email/password accounts only)
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailError, setNewEmailError] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Foundation Location Modal states
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [foundationLocationData, setFoundationLocationData] = useState({
    foundation_name: '',
    address: '',
    latitude: '',
    longitude: '',
    contact_phone: '',
    promptpay_number: ''
  });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');
  const [locationErrorMsg, setLocationErrorMsg] = useState('');
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isSearchingAddressGps, setIsSearchingAddressGps] = useState(false);

  // Foundation Status / Certification Modal states
  const [isFoundationStatusModalOpen, setIsFoundationStatusModalOpen] = useState(false);
  const [foundationDetails, setFoundationDetails] = useState(null);

  // Foundation Documents states
  const [foundationDocs, setFoundationDocs] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedDocToView, setSelectedDocToView] = useState(null);
  const [viewDocModalOpen, setViewDocModalOpen] = useState(false);

  // Avatar upload states
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    setImgError(false);
  }, [profile?.avatar_url, user?.user_metadata?.avatar_url]);

  const formatPhoneNumber = (val) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.startsWith('02')) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    } else {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  };

  const formatApprovalDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return null;
    }
  };

  const getDocTypeShortName = (type) => {
    switch (type) {
      case 'registration_cert': return 'ใบอนุญาต/ทะเบียน';
      case 'id_card': return 'บัตรประชาชน';
      case 'address_proof': return 'หลักฐานที่ตั้ง';
      default: return 'เอกสารแนบ';
    }
  };

  const getDocTypeFullName = (type) => {
    switch (type) {
      case 'registration_cert': return 'ใบอนุญาตจัดตั้งมูลนิธิ / หนังสือรับรองการจดทะเบียน';
      case 'id_card': return 'สำเนาบัตรประชาชนผู้มีอำนาจลงนาม';
      case 'address_proof': return 'หลักฐานสถานที่ตั้งศูนย์พักพิง';
      default: return 'เอกสารประกอบการยื่นขอรับรอง';
    }
  };


  // Help + privacy sheets, and the two-step account deletion
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const openDelete = () => {
    setDeleteConfirmText('');
    setDeleteError('');
    setIsPrivacyOpen(false);
    setIsDeleteOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (!supabase || !user || deleteConfirmText.trim() !== t('pf.delete.word')) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      // Best effort: remove uploaded profile photos first (the account rows go with the RPC)
      try {
        const { data: files } = await supabase.storage.from('chat_images').list('', { search: `avatar_${user.id}_` });
        const names = (files || []).map((f) => f.name).filter((n) => n.startsWith(`avatar_${user.id}_`));
        if (names.length) await supabase.storage.from('chat_images').remove(names);
      } catch { /* not critical */ }

      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      try {
        localStorage.removeItem(`user_verification_status_${user.id}`);
      } catch { /* ignore */ }
      await logout().catch(() => {});
      toast(t('pf.delete.done'), { tone: 'success' });
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Delete account failed:', err);
      setDeleteError(err?.message?.includes('admin_cannot_self_delete') ? t('pf.delete.adminError') : t('pf.delete.error'));
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast(t('pf.photo.notImage'), { tone: 'error' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast(t('pf.photo.tooBig'), { tone: 'error' });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      if (supabase && user) {
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat_images')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('chat_images')
          .getPublicUrl(fileName);

        const newAvatarUrl = publicUrlData.publicUrl;
        await updateProfile({ avatar_url: newAvatarUrl });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast(t('pf.photo.failed'), { tone: 'error' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    // Both are required: foundations call adopters on this number
    const phoneDigits = editPhone.replace(/\D/g, '');
    const nameErr = editFullName.trim() ? '' : t('pf.edit.nameRequired');
    const phoneErr = !phoneDigits
      ? t('pf.edit.phoneRequired')
      : !/^0\d{8,9}$/.test(phoneDigits) ? t('pf.edit.phoneInvalid') : '';
    setNameError(nameErr);
    setPhoneError(phoneErr);
    if (nameErr || phoneErr) {
      document.getElementById(nameErr ? 'pf-name' : 'pf-phone')?.focus();
      return;
    }

    setIsSavingProfile(true);
    setSaveErrorMsg('');
    setPhoneError('');

    try {
      const result = await updateProfile({
        full_name: editFullName.trim(),
        phone: formatPhoneNumber(phoneDigits)
      });

      if (result.error) throw result.error;

      setIsEditingInfo(false);
      toast(t('pf.edit.saved'), { tone: 'success' });
    } catch (err) {
      console.error('Error updating settings:', err);
      if (err?.code === '23514') setPhoneError(t('pf.edit.phoneInvalid'));
      else setSaveErrorMsg(t('pf.edit.saveFailed'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const fetchFoundationLocation = async () => {
    if (!user || !supabase) return;
    setIsFetchingLocation(true);
    setLocationSuccessMsg('');
    setLocationErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('foundation_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setFoundationDetails(data);
        setFoundationLocationData({
          foundation_name: data.foundation_name || profile?.full_name || '',
          address: data.address || '',
          latitude: data.latitude ? String(data.latitude) : '',
          longitude: data.longitude ? String(data.longitude) : '',
          contact_phone: data.contact_phone || profile?.phone || '',
          promptpay_number: data.promptpay_number || ''
        });
      } else {
        setFoundationDetails({
          foundation_name: profile?.full_name || '',
          address: '',
          latitude: '',
          longitude: '',
          contact_phone: profile?.phone || '',
          promptpay_number: '',
          registration_no: ''
        });
        setFoundationLocationData({
          foundation_name: profile?.full_name || '',
          address: '',
          latitude: '',
          longitude: '',
          contact_phone: profile?.phone || '',
          promptpay_number: ''
        });
      }
    } catch (err) {
      console.error('Error fetching foundation profile:', err);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  useEffect(() => {
    if (role === 'foundation') {
      fetchFoundationLocation();
      fetchFoundationDocuments();
    }

    const modalParam = searchParams.get('modal') || searchParams.get('open');
    if (modalParam === 'foundation' || modalParam === 'location') {
      fetchFoundationLocation();
      setIsLocationModalOpen(true);
    } else if (modalParam === 'settings') {
      settingsOpen();
    }
  }, [role, user, searchParams]);

  const fetchFoundationDocuments = async () => {
    if (!user || !supabase) return [];
    setIsLoadingDocs(true);
    try {
      const { data: docs, error } = await supabase
        .from('foundation_documents')
        .select('*')
        .eq('foundation_id', user.id);

      if (error) throw error;

      const resolvedDocs = [];
      if (docs && docs.length > 0) {
        for (const doc of docs) {
          let url = null;
          if (doc.file_url && doc.file_url.startsWith('http')) {
            url = doc.file_url;
          } else if (doc.file_path) {
            if (doc.file_path.startsWith('http')) {
              url = doc.file_path;
            } else {
              const { data: urlData, error: urlError } = await supabase.storage
                .from('foundation-docs')
                .createSignedUrl(doc.file_path, 3600);
              if (!urlError && urlData?.signedUrl) {
                url = urlData.signedUrl;
              } else {
                const { data: pubData } = supabase.storage
                  .from('foundation-docs')
                  .getPublicUrl(doc.file_path);
                if (pubData?.publicUrl) {
                  url = pubData.publicUrl;
                }
              }
            }
          }

          const fileExt = (doc.file_path || doc.file_name || '').toLowerCase();
          resolvedDocs.push({
            ...doc,
            url,
            isPdf: fileExt.endsWith('.pdf')
          });
        }
      }
      setFoundationDocs(resolvedDocs);
      return resolvedDocs;
    } catch (err) {
      console.error('Error fetching foundation documents:', err);
      return [];
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleOpenPermitDoc = async () => {
    let docs = foundationDocs;
    if (!docs || docs.length === 0) {
      docs = await fetchFoundationDocuments();
    }

    if (docs && docs.length > 0) {
      const permitDoc = docs.find(d => d.doc_type === 'registration_cert') || docs[0];
      setSelectedDocToView({
        docType: permitDoc.doc_type,
        title: getDocTypeFullName(permitDoc.doc_type),
        url: permitDoc.url,
        isPdf: permitDoc.isPdf,
        fileName: permitDoc.file_name || permitDoc.file_path?.split('/').pop() || 'ใบอนุญาตจัดตั้งมูลนิธิ'
      });
    } else {
      setSelectedDocToView({
        docType: 'registration_cert',
        title: 'ใบอนุญาตจัดตั้งมูลนิธิ',
        url: null,
        isPdf: false,
        fileName: null,
        emptyNotice: 'ไม่พบไฟล์เอกสารแนบในระบบ บัญชีมูลนิธินี้ได้รับการอนุมัติอย่างเป็นทางการในฐานข้อมูลแล้ว'
      });
    }
    setViewDocModalOpen(true);
  };

  const handleViewSpecificDoc = (doc) => {
    setSelectedDocToView({
      docType: doc.doc_type,
      title: getDocTypeFullName(doc.doc_type),
      url: doc.url,
      isPdf: doc.isPdf,
      fileName: doc.file_name || doc.file_path?.split('/').pop() || 'เอกสารแนบ'
    });
    setViewDocModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('editLocation') === 'true' && role === 'foundation') {
      setIsLocationModalOpen(true);
    }
  }, [searchParams, role]);

  const handleSearchCoordsFromAddress = async () => {
    const query = foundationLocationData.address.trim();
    if (!query) {
      setLocationErrorMsg('กรุณากรอกที่อยู่ศูนย์พักพิง หรือวางพิกัดก่อนกดค้นหา');
      return;
    }
    setIsSearchingAddressGps(true);
    setLocationErrorMsg('');
    setLocationSuccessMsg('');
    try {
      const geoResult = await searchCoordinatesFromAddress(query);
      if (geoResult) {
        const lat = geoResult.latitude.toFixed(6);
        const lng = geoResult.longitude.toFixed(6);

        // หากผู้ใช้ป้อนพิกัดมาโดยตรง ลองดึงชื่อที่อยู่อัตโนมัติ
        let resolvedAddress = query;
        const parsed = parseCoordinatesFromText(query);
        if (parsed) {
          try {
            const rev = await getAddressFromCoordinates(lat, lng);
            if (rev && rev.formattedAddress) {
              resolvedAddress = rev.formattedAddress;
            }
          } catch (e) {
            console.warn('Reverse geocode error:', e);
          }
        }

        setFoundationLocationData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address: resolvedAddress
        }));
        const placeShort = geoResult.displayName.split(',')[0];
        setLocationSuccessMsg(`ปักหมุดสำเร็จ: ${placeShort} (${lat}, ${lng}) สามารถลากหมุดบนแผนที่เพื่อปรับตำแหน่งได้`);
        setTimeout(() => setLocationSuccessMsg(''), 5000);
      } else {
        setLocationErrorMsg('ไม่พบพิกัดจากที่อยู่นี้ กรุณาระบุชื่อตำบล อำเภอ หรือคลิกปักหมุดบนแผนที่ได้โดยตรง');
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
      setLocationErrorMsg('เกิดข้อผิดพลาดในการค้นหาพิกัด');
    } finally {
      setIsSearchingAddressGps(false);
    }
  };

  const handleInteractivePinChange = async (lat, lng) => {
    setFoundationLocationData(prev => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng)
    }));

    // ดึงชื่อที่อยู่ภาษาไทยตามจุดพิกัดใหม่ที่ผู้ใช้ลากหมุดไปวาง
    try {
      const rev = await getAddressFromCoordinates(lat, lng);
      if (rev && rev.formattedAddress) {
        setFoundationLocationData(prev => ({
          ...prev,
          address: rev.formattedAddress
        }));
      }
    } catch (e) {
      console.warn('Pin change reverse geocode error:', e);
    }
  };

  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setLocationErrorMsg('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setIsGettingGps(true);
    setLocationErrorMsg('');
    setLocationSuccessMsg('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);

        // Reverse geocode เพื่อดึงชื่อที่อยู่ภาษาไทยอัตโนมัติ
        let resolvedAddress = '';
        try {
          const rev = await getAddressFromCoordinates(lat, lng);
          if (rev && rev.formattedAddress) {
            resolvedAddress = rev.formattedAddress;
          }
        } catch (e) {
          console.warn('Reverse geocode error:', e);
        }

        setFoundationLocationData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address: resolvedAddress || prev.address
        }));
        setIsGettingGps(false);
        if (resolvedAddress) {
          setLocationSuccessMsg(`ระบุพิกัดและที่อยู่สำเร็จ: ${resolvedAddress}`);
        } else {
          setLocationSuccessMsg(`ระบุพิกัดสำเร็จ (${lat}, ${lng})`);
        }
        setTimeout(() => setLocationSuccessMsg(''), 4000);
      },
      (err) => {
        console.warn('GPS error:', err);
        setLocationErrorMsg('ไม่สามารถเข้าถึงพิกัด GPS ได้ กรุณาอนุญาตให้เข้าถึงตำแหน่งในเบราว์เซอร์ หรือใช้ปุ่ม "ค้นหาตำแหน่งจากที่อยู่นี้"');
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveFoundationLocation = async (e) => {
    e.preventDefault();
    if (!user || !supabase) return;

    setIsSavingLocation(true);
    setLocationSuccessMsg('');
    setLocationErrorMsg('');

    try {
      const lat = foundationLocationData.latitude ? parseFloat(foundationLocationData.latitude) : null;
      const lng = foundationLocationData.longitude ? parseFloat(foundationLocationData.longitude) : null;

      const { error } = await supabase
        .from('foundation_profiles')
        .update({
          address: foundationLocationData.address.trim(),
          latitude: lat,
          longitude: lng,
          contact_phone: foundationLocationData.contact_phone.trim(),
          promptpay_number: (foundationLocationData.promptpay_number || '').trim().replace(/[-\s]/g, '')
        })
        .eq('id', user.id);

      if (error) throw error;

      // อัปเดตพิกัดสัตว์เลี้ยงที่ยังไม่มีพิกัดเฉพาะ ให้ได้รับพิกัดศูนย์พักพิงใหม่ทันที
      if (lat && lng) {
        await supabase
          .from('animals')
          .update({ latitude: lat, longitude: lng })
          .eq('foundation_id', user.id)
          .is('latitude', null);
      }

      setLocationSuccessMsg('บันทึกที่ตั้งและพิกัดศูนย์พักพิงเรียบร้อยแล้ว');
      setTimeout(() => {
        setIsLocationModalOpen(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to update foundation location:', err);
      setLocationErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const getRoleDisplayName = (r) => {
    if (r === 'super_admin') return t('pf.role.admin');
    if (r === 'foundation') return t('pf.role.foundation');
    return t('pf.role.user');
  };

  const getRoleBadgeClasses = (r) => {
    if (r === 'super_admin') return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
    if (r === 'foundation') return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
    return { bg: 'var(--gray-100)', text: 'var(--text-medium)', border: 'var(--gray-200)' };
  };

  const roleBadge = getRoleBadgeClasses(role);

  const isVerified = 
    userVerificationStatus === 'verified' ||
    user?.user_metadata?.is_verified === true ||
    user?.user_metadata?.user_verification_status === 'verified' ||
    profile?.is_verified === true;

  const menuItems = [
    {
      key: 'settings', label: 'การตั้งค่าบัญชี', desc: '',
      icon: <Settings size={24} />, show: true, 
      onClick: () => settingsOpen(),
    },
    {
      key: 'foundation-location', label: 'ข้อมูลศูนย์พักพิง, ที่อยู่จัดส่ง และพร้อมเพย์', desc: 'แก้ไขที่อยู่จัดส่งพัสดุ, เบอร์ติดต่อ, เบอร์พร้อมเพย์ และพิกัด GPS',
      icon: <MapPin size={24} />, show: role === 'foundation', 
      onClick: () => {
        fetchFoundationLocation();
        setIsLocationModalOpen(true);
      },
    },
    {
      key: 'foundation-status', label: 'สถานะการรับรองมูลนิธิ', 
      desc: foundationStatus === 'approved' ? 'อนุมัติแล้ว' : foundationStatus === 'pending' ? 'รอตรวจสอบ' : foundationStatus === 'rejected' ? 'ไม่ผ่านการอนุมัติ' : 'ยังไม่ส่งข้อมูล', 
      badge: true,
      badgeColor: foundationStatus === 'approved' ? 'rgba(33, 225, 146, 0.15)' : foundationStatus === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 168, 38, 0.2)',
      badgeTextColor: foundationStatus === 'approved' ? '#1b7b68' : foundationStatus === 'rejected' ? '#DC2626' : '#D97706',
      icon: <Briefcase size={24} />, show: role === 'foundation', 
      onClick: () => {
        if (foundationStatus === 'approved') {
          if (!foundationDetails) {
            fetchFoundationLocation();
          }
          setIsFoundationStatusModalOpen(true);
        } else if (foundationStatus === 'pending' || foundationStatus === 'rejected') {
          navigate('/foundation/pending');
        } else if (foundationStatus === 'none') {
          navigate('/foundation/onboarding');
        }
      },
    },
    {
      key: 'user-verification', label: 'ยืนยันตัวตน', 
      desc: isVerified ? 'เสร็จสิ้น' : 'ยังไม่ยืนยัน', 
      badge: true,
      badgeColor: isVerified ? 'rgba(33, 225, 146, 0.15)' : 'rgba(249, 168, 38, 0.2)',
      badgeTextColor: isVerified ? '#1b7b68' : '#D97706',
      icon: <ShieldCheck size={24} />, show: role === 'user', onClick: () => navigate('/verify-user'),
    },
    {
      key: 'contact-admin', label: 'ติดต่อฝ่ายสนับสนุน', desc: '',
      icon: <MessageSquare size={24} />, show: role !== 'super_admin', onClick: () => navigate('/support-chat'),
    },
  ].filter(item => item.show);

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ผู้ใช้งาน';
  const displayEmail = user?.email || 'user@example.com';

  // Search preferences shown in the "การค้นหา" section (adopters only)
  useEffect(() => {
    if (role !== 'user' || !user?.id) return;
    api.getUserPreferences(user.id).then(setSearchPrefs).catch(() => {});
  }, [role, user?.id]);

  const savedArea = loadSavedLocation();
  // Only mention what the user narrowed down, e.g. "แมว · 50 กม." or "ทั้งหมด · 50 กม."
  const prefsSummary = (() => {
    if (!searchPrefs) return '…';
    const picked = [
      { dog: t('animal.dog'), cat: t('animal.cat') }[searchPrefs.animalType],
      { male: t('animal.male'), female: t('animal.female') }[searchPrefs.gender],
    ].filter(Boolean);
    const distance = searchPrefs.maxDistance >= 300
      ? t('pf.filters.anyDistance')
      : t('filters.km', { n: searchPrefs.maxDistance });
    // Only mention what the user narrowed down, e.g. "แมว · 50 กม." or "ทั้งหมด · 50 กม."
    const living = searchPrefs.living?.length ? [t('pf.filters.livingCount', { n: searchPrefs.living.length })] : [];
    return [...(picked.length ? picked : [t('pf.filters.all')]), distance, ...living].join(' · ');
  })();
  const initial = (displayName || '?').trim().charAt(0).toUpperCase();
  const foundationMenu = menuItems.filter((item) => item.key.startsWith('foundation'));
  // Dashes appear as you type (081-234-5678) while the cursor stays next to the digit you just typed.
  // Backspace / Delete on a dash removes the digit beside it instead of getting stuck.
  const handlePhoneChange = (e) => {
    const el = e.target;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;
    const inputType = e.nativeEvent?.inputType || '';
    let digits = raw.replace(/\D/g, '');
    let before = raw.slice(0, caret).replace(/\D/g, '').length;
    if (digits === editPhone.replace(/\D/g, '') && raw.length < editPhone.length) {
      if (inputType === 'deleteContentBackward' && before > 0) {
        digits = digits.slice(0, before - 1) + digits.slice(before);
        before -= 1;
      } else if (inputType === 'deleteContentForward') {
        digits = digits.slice(0, before) + digits.slice(before + 1);
      }
    }
    // Already 10 digits: an extra key press is ignored instead of pushing the last digit out
    if (digits.length > 10 && inputType.startsWith('insert') && editPhone.replace(/\D/g, '').length >= 10) {
      const keepAt = Math.max(0, caret - (raw.length - editPhone.length));
      requestAnimationFrame(() => { try { el.setSelectionRange(keepAt, keepAt); } catch { /* input gone */ } });
      setEditPhone(editPhone);
      return;
    }
    digits = digits.slice(0, 10);
    before = Math.min(before, digits.length);
    const formatted = formatPhoneNumber(digits);
    setEditPhone(formatted);
    setPhoneError('');
    requestAnimationFrame(() => {
      let pos = 0;
      let seen = 0;
      while (pos < formatted.length && seen < before) {
        if (/\d/.test(formatted[pos])) seen += 1;
        pos += 1;
      }
      try { el.setSelectionRange(pos, pos); } catch { /* input gone */ }
    });
  };

  // How this account signs in decides whether the email can be changed here
  const isGoogleAccount = (user?.app_metadata?.providers || [user?.app_metadata?.provider]).includes('google');
  const pendingEmail = user?.new_email || '';

  const handleSendEmailChange = async () => {
    const next = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) { setNewEmailError(t('pf.email.invalid')); return; }
    if (next === (user?.email || '').toLowerCase()) { setNewEmailError(t('pf.email.same')); return; }
    setIsSendingEmail(true);
    setNewEmailError('');
    const { error } = await changeEmail(next);
    setIsSendingEmail(false);
    if (error) {
      console.error('Change email failed:', error.message);
      setNewEmailError(/already|registered|exists/i.test(error.message || '') ? t('pf.email.taken') : t('pf.email.failed'));
      return;
    }
    setIsChangingEmail(false);
    setNewEmail('');
    toast(t('pf.email.sent', { email: next }), { tone: 'success', duration: 6000 });
  };

  // Profile phone, falling back to the one given at sign-up / verification
  const savedPhone = profile?.phone || user?.user_metadata?.phone || '';
  const settingsOpen = () => {
    setEditFullName(profile?.full_name || user?.user_metadata?.full_name || '');
    setEditPhone(formatPhoneNumber(savedPhone));
    setSaveErrorMsg('');
    setPhoneError('');
    setNameError('');
    setIsChangingEmail(false);
    setNewEmail('');
    setNewEmailError('');
    setIsEditingInfo(true);
  };

  return (
    <div className="page-container" style={{ padding: 0, minHeight: '100dvh' }}>
      <div className="pf-page">
        <input
          type="file"
          ref={avatarInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarSelect}
        />

        {/* Left column on desktop (identity card); on mobile its pieces flow into the page in order */}
        <aside className="pf-side">
          <motion.header className="pf-header">
            <div className="pf-avatar">
              <div className="pf-avatar__img">
                {isUploadingAvatar ? (
                  <Loader className="spin" size={28} />
                ) : avatarUrl && !imgError ? (
                  <img src={avatarUrl} alt="" onError={() => setImgError(true)} />
                ) : (
                  initial
                )}
              </div>
              <button
                type="button"
                className="pf-avatar__edit"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label={t('pf.changePhoto')}
                title={t('pf.changePhoto')}
              >
                <Camera size={18} />
              </button>
            </div>
            <div className="pf-header__text">
              <h1 className="pf-header__name">{displayName}</h1>
              <div className="pf-header__badges">
                {role === 'user' ? (
                  isVerified
                    ? <Badge tone="success" icon={ShieldCheck}>{t('pf.verified')}</Badge>
                    : <Badge tone="pending" icon={Shield}>{t('pf.notVerified')}</Badge>
                ) : (
                  <Badge tone="neutral" icon={role === 'foundation' ? Building2 : User}>{getRoleDisplayName(role)}</Badge>
                )}
              </div>
            </div>
          </motion.header>

          <div className="pf-info">
            <ProfileSection
              title={t('pf.myInfo')}
              action={!isEditingInfo && <button type="button" className="pf-section__action" onClick={settingsOpen}>{t('common.edit')}</button>}
            >
              {isEditingInfo ? (
                // Edit in place: no pop-up, the fields sit where the values were
                <form onSubmit={handleSaveSettings} className="pf-inline-form" noValidate>
                  {saveErrorMsg && (
                    <p className="pf-edit-form__msg pf-edit-form__msg--error" role="alert">
                      <AlertCircle size={18} aria-hidden="true" /> {saveErrorMsg}
                    </p>
                  )}
                  <Field
                    id="pf-name"
                    label={t('pf.edit.fullName')}
                    value={editFullName}
                    onChange={(e) => { setEditFullName(e.target.value); setNameError(''); }}
                    placeholder={t('pf.edit.fullNamePh')}
                    autoComplete="name"
                    required
                    aria-required="true"
                    error={nameError}
                    autoFocus
                    enterKeyHint="next"
                  />
                  <Field
                    id="pf-phone"
                    label={t('pf.edit.phone')}
                    type="tel"
                    inputMode="tel"
                    value={editPhone}
                    onChange={handlePhoneChange}
                    placeholder={t('pf.edit.phonePh')}
                    autoComplete="tel"
                    enterKeyHint="done"
                    required
                    aria-required="true"
                    error={phoneError}
                  />
                  <div className="pf-inline-form__static">
                    <span className="pf-row__label">{t('pf.email')}</span>
                    <span className="pf-inline-form__email">{displayEmail}</span>
                    {isGoogleAccount ? (
                      <span className="pf-inline-form__note">{t('pf.email.googleLocked')}</span>
                    ) : !isChangingEmail ? (
                      <button type="button" className="pf-inline-form__link" onClick={() => { setIsChangingEmail(true); setNewEmailError(''); }}>
                        {t('pf.email.change')}
                      </button>
                    ) : null}
                  </div>
                  {!isGoogleAccount && isChangingEmail && (
                    <div className="pf-email-change">
                      <Field
                        id="pf-new-email"
                        label={t('pf.email.new')}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder={t('pf.email.newPh')}
                        value={newEmail}
                        onChange={(e) => { setNewEmail(e.target.value); setNewEmailError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendEmailChange(); } }}
                        error={newEmailError}
                        autoFocus
                      />
                      <p className="pf-inline-form__note">{t('pf.email.howItWorks')}</p>
                      <div className="pf-email-change__actions">
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setIsChangingEmail(false); setNewEmail(''); setNewEmailError(''); }} disabled={isSendingEmail}>{t('pf.email.keep')}</Button>
                        <Button type="button" variant="secondary" size="sm" loading={isSendingEmail} onClick={handleSendEmailChange}>{t('pf.email.send')}</Button>
                      </div>
                    </div>
                  )}
                  <div className="pf-inline-form__actions">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditingInfo(false)} disabled={isSavingProfile}>{t('common.cancel')}</Button>
                    <Button type="submit" variant="primary" size="sm" loading={isSavingProfile}>{t('common.save')}</Button>
                  </div>
                </form>
              ) : (
                <>
                  <InfoRow label={t('pf.phone')} value={savedPhone ? formatPhoneNumber(savedPhone) : t('pf.notSet')} tone={savedPhone ? undefined : 'muted'} />
                  <div className="pf-row pf-row--email">
                    <span className="pf-row__label">{t('pf.email')}</span>
                    <span className="pf-row__value">
                      <span className="pf-email__addr">{displayEmail}</span>
                      {pendingEmail ? (
                        <span className="pf-email__meta pf-email__meta--pending">{t('pf.email.pending', { email: pendingEmail })}</span>
                      ) : isGoogleAccount ? (
                        <span className="pf-email__meta"><GoogleMark /> {t('pf.email.google')}</span>
                      ) : user?.email_confirmed_at ? (
                        <span className="pf-email__meta pf-email__meta--ok"><CheckCircle size={14} aria-hidden="true" /> {t('pf.email.verified')}</span>
                      ) : null}
                    </span>
                  </div>
                </>
              )}
            </ProfileSection>
          </div>
        </aside>

        <div className="pf-main">
          {/* Not verified yet: the one thing blocking adoption requests */}
          {role === 'user' && !isVerified && (
            <div className="pf-verify">
              <p className="pf-verify__title">{t('pf.verifyCard.title')}</p>
              <p className="pf-verify__text">{t('pf.verifyCard.text')}</p>
              <Button variant="primary" onClick={() => navigate('/verify-user')}>
                <ShieldCheck size={20} aria-hidden="true" /> {t('pf.verifyCard.cta')}
              </Button>
            </div>
          )}

          {role === 'user' && (
            <div className="pf-requests">
              <ProfileSection
                title={t('pf.requests')}
                action={matches?.length > 0 && <Link to="/matches" className="pf-section__action">{t('common.seeAll')}</Link>}
              >
                <AdoptionRequests matches={matches} />
              </ProfileSection>
            </div>
          )}

          {role === 'foundation' && foundationMenu.length > 0 && (
            <div className="pf-requests">
              <ProfileSection title={t('pf.myFoundation')}>
                {foundationMenu.map((item) => (
                  <InfoRow
                    key={item.key}
                    label={item.label}
                    value={item.badge ? item.desc : ''}
                    tone={item.badge && foundationStatus === 'approved' ? 'success' : item.badge ? 'muted' : undefined}
                    onClick={item.onClick}
                  />
                ))}
              </ProfileSection>
            </div>
          )}

          {role === 'user' && (
            <div className="pf-more">
              <ProfileSection title={t('pf.search')}>
                <InfoRow
                  icon={MapPin}
                  label={t('pf.area')}
                  value={savedArea?.label ? t('pf.areaNear', { area: savedArea.label }) : t('pf.areaGps')}
                  to="/?sheet=location"
                />
                <InfoRow icon={Search} label={t('pf.filters')} value={prefsSummary} to="/?sheet=filters" />
              </ProfileSection>
            </div>
          )}

          {/* Settings + help in one group (DESIGN.md §8.1); log out sits last, quietly */}
          <div className="pf-more">
            <ProfileSection title={role === 'super_admin' ? t('pf.settings') : t('pf.settingsHelp')}>
              <div className="pf-row">
                <Languages size={20} className="pf-row__icon" aria-hidden="true" />
                <span className="pf-row__label">{t('pf.language')}</span>
                <span className="pf-row__value"><LanguageSwitch /></span>
              </div>
              {role !== 'super_admin' && (
                <>
                  <InfoRow icon={HelpCircle} label={t('pf.faq')} value="" onClick={() => setIsFaqOpen(true)} />
                  <InfoRow icon={MessageSquare} label={t('pf.chatTeam')} value="" to="/support-chat" />
                </>
              )}
              <InfoRow icon={Lock} label={t('pf.privacy')} value="" onClick={() => setIsPrivacyOpen(true)} />
              <button type="button" className="pf-row pf-row--menu pf-row--link pf-row--danger" onClick={handleLogout}>
                <LogOut size={20} className="pf-row__icon" aria-hidden="true" />
                <span className="pf-row__label">{t('pf.logout')}</span>
              </button>
            </ProfileSection>
          </div>
        </div>
      </div>


      {/* Help: questions people ask most */}
      <Dialog open={isFaqOpen} onClose={() => setIsFaqOpen(false)} title={t('pf.faq')} className="pf-sheet">
        <FaqList />
        <div className="ui-dialog__actions">
          <Link to="/support-chat" className="ui-btn ui-btn--secondary">
            <MessageSquare size={18} aria-hidden="true" /> {t('pf.chatTeam')}
          </Link>
        </div>
      </Dialog>

      {/* Privacy & data: what we keep, and the way out */}
      <Dialog open={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} title={t('pf.privacy')} className="pf-sheet">
        <div className="pf-privacy">
          <p>{t('pf.privacy.intro')}</p>
          <ul>
            <li>{t('pf.privacy.account')}</li>
            {role === 'user' && <li>{t('pf.privacy.kyc')}</li>}
            <li>{t('pf.privacy.activity')}</li>
          </ul>
          <p>{t('pf.privacy.use')}</p>
        </div>
        {role !== 'super_admin' && (
          <div className="pf-danger-zone">
            <p className="pf-danger-zone__title">{t('pf.delete.title')}</p>
            <p className="pf-danger-zone__text">{t('pf.delete.text')}</p>
            <Button variant="secondary" className="pf-danger-zone__btn" onClick={openDelete}>
              <Trash2 size={18} aria-hidden="true" /> {t('pf.delete.cta')}
            </Button>
          </div>
        )}
      </Dialog>

      <Dialog open={isDeleteOpen} onClose={() => !isDeleting && setIsDeleteOpen(false)} title={t('pf.delete.confirmTitle')}>
        <div className="pf-edit-form">
        <div className="pf-privacy">
          <p>{t('pf.delete.confirmText')}</p>
          <ul>
            <li>{t('pf.delete.lose1')}</li>
            <li>{t('pf.delete.lose2')}</li>
            <li>{t('pf.delete.lose3')}</li>
          </ul>
        </div>
        {deleteError && (
          <p className="pf-edit-form__msg pf-edit-form__msg--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" /> {deleteError}
          </p>
        )}
        <Field
          id="pf-delete-confirm"
          label={t('pf.delete.typeToConfirm', { word: t('pf.delete.word') })}
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          autoComplete="off"
          disabled={isDeleting}
        />
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>{t('common.cancel')}</Button>
          <Button
            variant="danger"
            loading={isDeleting}
            disabled={deleteConfirmText.trim() !== t('pf.delete.word')}
            onClick={handleDeleteAccount}
          >
            {t('pf.delete.confirmCta')}
          </Button>
        </div>
        </div>
      </Dialog>

      {/* Foundation Verification Certificate & Status Modal */}
      <AnimatePresence>
        {isFoundationStatusModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION.base}
            onClick={() => setIsFoundationStatusModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '16px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={MOTION.base}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '24px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                boxSizing: 'border-box'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                  ข้อมูลการรับรองมูลนิธิ
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFoundationStatusModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#374151'}
                  onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Foundation Identity Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                marginBottom: '18px',
                border: '1px solid #F3F4F6'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4B5563',
                  flexShrink: 0
                }}>
                  <Building2 size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    margin: '0 0 3px 0',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#111827',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {foundationDetails?.foundation_name || profile?.full_name || 'ศูนย์พักพิงสัตว์'}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                    <CheckCircle size={14} />
                    <span>ได้รับการรับรองแล้ว (Verified)</span>
                  </div>
                </div>
              </div>

              {/* Detail List (Clean Hairline Rows) */}
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.88rem' }}>
                  <span style={{ color: '#6B7280' }}>เลขทะเบียนองค์กร</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {foundationDetails?.registration_no || '-'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.88rem' }}>
                  <span style={{ color: '#6B7280' }}>วันที่อนุมัติ</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {foundationDetails?.reviewed_at ? formatApprovalDate(foundationDetails.reviewed_at) : '-'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.88rem' }}>
                  <span style={{ color: '#6B7280' }}>เบอร์โทรศัพท์</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {foundationDetails?.contact_phone ? formatPhoneNumber(foundationDetails.contact_phone) : '-'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '11px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.88rem', gap: '16px' }}>
                  <span style={{ color: '#6B7280', flexShrink: 0 }}>ที่ตั้งศูนย์</span>
                  <span style={{ fontWeight: 500, color: '#111827', textAlign: 'right', wordBreak: 'break-word', lineHeight: 1.4 }}>
                    {foundationDetails?.address || '-'}
                  </span>
                </div>

                {/* Attached Document Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  fontSize: '0.88rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <FileText size={17} color="#6B7280" style={{ flexShrink: 0 }} />
                    <span style={{ color: '#6B7280' }}>เอกสารแนบ</span>
                    <span style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      ใบอนุญาตจัดตั้งมูลนิธิ
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenPermitDoc}
                    disabled={isLoadingDocs}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-color, #D97706)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: isLoadingDocs ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                      flexShrink: 0
                    }}
                  >
                    <span>{isLoadingDocs ? 'กำลังโหลด...' : 'ดูเอกสาร'}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* If multiple documents attached */}
                {foundationDocs.length > 1 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    {foundationDocs.map((doc, idx) => (
                      <button
                        key={doc.id || idx}
                        type="button"
                        onClick={() => handleViewSpecificDoc(doc)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F3F4F6',
                          border: 'none',
                          fontSize: '0.75rem',
                          color: '#4B5563',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FileText size={12} />
                        <span>{getDocTypeShortName(doc.doc_type)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsFoundationStatusModalOpen(false);
                    navigate('/foundation');
                  }}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <span>ไปยังหน้าหลักมูลนิธิ</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFoundationStatusModalOpen(false);
                    setIsLocationModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    color: '#4B5563',
                    fontSize: '0.86rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                >
                  <MapPin size={15} color="#6B7280" />
                  <span>แก้ไขที่ตั้งและพิกัดศูนย์พักพิง</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foundation Document Preview Modal */}
      <AnimatePresence>
        {viewDocModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION.base}
            onClick={() => setViewDocModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1100,
              padding: '16px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={MOTION.base}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '24px',
                width: '100%',
                maxWidth: '620px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #E5E7EB',
                overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
                      {selectedDocToView?.title || 'เอกสารรับรองมูลนิธิ'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280' }}>
                      {selectedDocToView?.fileName || 'เอกสารแนบที่ส่งมาตอนยื่นขอรับรอง'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewDocModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-medium)', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Doc Tabs if multiple */}
              {foundationDocs.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px', flexShrink: 0 }}>
                  {foundationDocs.map((doc, idx) => {
                    const isSelected = selectedDocToView?.docType === doc.doc_type;
                    return (
                      <button
                        key={doc.id || idx}
                        type="button"
                        onClick={() => handleViewSpecificDoc(doc)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: isSelected ? '1.5px solid #059669' : '1px solid #E5E7EB',
                          backgroundColor: isSelected ? '#ECFDF5' : '#F9FAFB',
                          color: isSelected ? '#065F46' : '#4B5563',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.12s'
                        }}
                      >
                        {getDocTypeShortName(doc.doc_type)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Viewer Content Body */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
                {selectedDocToView?.url ? (
                  selectedDocToView.isPdf ? (
                    <div style={{ width: '100%', height: '520px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F3F4F6' }}>
                      <iframe
                        src={`${selectedDocToView.url}#toolbar=1`}
                        title={selectedDocToView.title}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: '100%',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#111827',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '12px',
                      minHeight: '340px'
                    }}>
                      <img
                        src={selectedDocToView.url}
                        alt={selectedDocToView.title}
                        style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }}
                      />
                    </div>
                  )
                ) : (
                  <div style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '12px',
                    border: '1px dashed #D1D5DB',
                    margin: 'auto 0'
                  }}>
                    <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <AlertCircle size={28} />
                    </div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                      ไม่พบไฟล์เอกสารแนบในระบบ
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#6B7280', lineHeight: 1.5, maxWidth: '420px', marginInline: 'auto' }}>
                      {selectedDocToView?.emptyNotice || 'บัญชีมูลนิธินี้ได้รับการอนุมัติอย่างเป็นทางการแล้ว แต่ยังไม่มีไฟล์เอกสารแนบในพื้นที่จัดเก็บ'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
                {selectedDocToView?.url && (
                  <a
                    href={selectedDocToView.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      height: '42px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={16} />
                    <span>เปิดดูในแท็บใหม่ / ดาวน์โหลด</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setViewDocModalOpen(false)}
                  style={{
                    flex: selectedDocToView?.url ? '0 0 100px' : 1,
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid var(--gray-300)',
                    backgroundColor: 'white',
                    color: 'var(--text-dark)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ปิด
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foundation Location & GPS Modal */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION.base}
            onClick={() => setIsLocationModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '16px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={MOTION.base}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '520px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 48px rgba(0,0,0,0.12)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>ข้อมูลศูนย์พักพิง, ที่อยู่จัดส่ง และพร้อมเพย์</h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-medium)' }}>ที่อยู่และเบอร์ติดต่อสำหรับส่งพัสดุ และเบอร์ PromptPay สำหรับรับเงินบริจาคตรง</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-medium)', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {locationSuccessMsg && (
                <div style={{ padding: '10px 14px', backgroundColor: '#ECFDF5', color: '#059669', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid #A7F3D0' }}>
                  <CheckCircle size={18} /> {locationSuccessMsg}
                </div>
              )}

              {locationErrorMsg && (
                <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid #FCA5A5' }}>
                  {locationErrorMsg}
                </div>
              )}

              {isFetchingLocation ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', gap: '8px', color: 'var(--text-medium)' }}>
                  <Loader className="spin" size={24} />
                  <span>กำลังโหลดข้อมูลที่ตั้ง...</span>
                </div>
              ) : (
                <form onSubmit={handleSaveFoundationLocation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>ชื่อมูลนิธิ/ศูนย์พักพิง</label>
                    <input
                      type="text"
                      value={foundationLocationData.foundation_name}
                      disabled
                      style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--gray-200)', backgroundColor: 'var(--gray-50)', color: 'var(--text-medium)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>ที่อยู่ศูนย์พักพิง</label>
                      <button
                        type="button"
                        onClick={handleGetGpsLocation}
                        disabled={isGettingGps}
                        style={{
                          background: '#FEF3C7',
                          border: '1px solid #D97706',
                          borderRadius: '6px',
                          color: '#B45309',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: isGettingGps ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px'
                        }}
                      >
                        {isGettingGps ? <Loader className="spin" size={13} /> : <MapPin size={13} color="#D97706" />}
                        {isGettingGps ? 'กำลังระบุพิกัด...' : 'ใช้พิกัดปัจจุบัน'}
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={foundationLocationData.address}
                      onChange={e => setFoundationLocationData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="เช่น ภาควิชาวิศวกรรมอุตสาหการ มหาวิทยาลัยขอนแก่น หรือพิกัด 16°28'19.4&quot;N 102°49'22.8&quot;E"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        พิมพ์ชื่อสถานที่, ที่อยู่ หรือวางพิกัด Google Maps แล้วกดค้นหา หรือกด <b>"ใช้พิกัดปัจจุบัน"</b>
                      </span>
                      <button
                        type="button"
                        onClick={handleSearchCoordsFromAddress}
                        disabled={isSearchingAddressGps || !foundationLocationData.address.trim()}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-color)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: !foundationLocationData.address.trim() ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0,
                          opacity: !foundationLocationData.address.trim() ? 0.5 : 1
                        }}
                      >
                        {isSearchingAddressGps ? <Loader className="spin" size={13} /> : <Search size={13} />}
                        {isSearchingAddressGps ? 'กำลังค้นหา...' : 'ค้นหาตำแหน่ง / พิกัดนี้'}
                      </button>
                    </div>
                  </div>

                  {/* Interactive Map with Draggable Pin */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={14} color="var(--primary-color)" />
                        ตำแหน่งบนแผนที่
                      </label>
                      {foundationLocationData.latitude && foundationLocationData.longitude && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${foundationLocationData.latitude},${foundationLocationData.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>เปิดใน Google Maps</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <InteractiveLocationPicker
                      latitude={foundationLocationData.latitude}
                      longitude={foundationLocationData.longitude}
                      onChange={handleInteractivePinChange}
                      height={240}
                      zoom={17}
                    />

                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                        คลิกบนแผนที่หรือลากหมุดสีแดงเพื่อปรับจุดพิกัด
                      </span>
                      {foundationLocationData.latitude && foundationLocationData.longitude && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.74rem', fontWeight: 600 }}>
                          <CheckCircle size={13} /> พิกัด: {Number(foundationLocationData.latitude).toFixed(5)}, {Number(foundationLocationData.longitude).toFixed(5)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '12px',
                  }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>เบอร์โทรติดต่อศูนย์ / พัสดุ</label>
                      <input
                        type="tel"
                        value={foundationLocationData.contact_phone}
                        onChange={e => setFoundationLocationData(prev => ({ ...prev, contact_phone: formatPhoneNumber(e.target.value) }))}
                        placeholder="เช่น 0812345678"
                        maxLength={12}
                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px', display: 'block' }}>
                        สำหรับผู้บริจาคหรือพนักงานขนส่งโทรสอบถาม
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>เบอร์พร้อมเพย์ (PromptPay)</label>
                      <input
                        type="text"
                        value={foundationLocationData.promptpay_number}
                        onChange={e => setFoundationLocationData(prev => ({ ...prev, promptpay_number: e.target.value.replace(/[^\d-]/g, '') }))}
                        placeholder="เบอร์มือถือ หรือ เลข 13 หลัก"
                        maxLength={18}
                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px', display: 'block' }}>
                        ใช้สร้าง Dynamic QR ให้ผู้บริจาคโอนเข้าตรง
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsLocationModalOpen(false)}
                      style={{ flex: 1, height: '42px', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: 'white', color: 'var(--text-dark)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingLocation}
                      className="btn btn-primary"
                      style={{ flex: 1, height: '42px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}
                    >
                      {isSavingLocation ? <Loader className="spin" size={18} /> : 'บันทึกข้อมูล'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
