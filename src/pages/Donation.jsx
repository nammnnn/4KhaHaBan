import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Package, 
  AlertTriangle, 
  QrCode, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  TrendingUp, 
  MapPin, 
  Camera, 
  ChevronRight, 
  Info,
  Sparkles,
  Phone,
  User,
  PiggyBank,
  Loader,
  Upload,
  Dog,
  Cat,
  ExternalLink,
  Search
} from 'lucide-react';
import { searchCoordinatesFromAddress, getAddressFromCoordinates } from '../lib/geo';

// Auth and DB
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';

// PromptPay
import { QRCodeSVG } from 'qrcode.react';
import generatePayload from 'promptpay-qr';

const CustomDropdown = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
      <div 
        className="premium-select" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '16px', backgroundImage: 'none' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedOption?.label}</span>
        <ChevronRight 
          size={16} 
          color="#D97706" 
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} 
        />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                border: '1px solid #E5E7EB',
                zIndex: 100,
                maxHeight: '200px',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              {options.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: value === opt.value ? '#FEF3C7' : '#fff',
                    color: value === opt.value ? '#D97706' : '#374151',
                    fontWeight: value === opt.value ? 600 : 400,
                    borderBottom: '1px solid #F3F4F6',
                    fontSize: '0.9rem',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FEF3C7'}
                  onMouseLeave={(e) => e.currentTarget.style.background = value === opt.value ? '#FEF3C7' : '#fff'}
                >
                  {opt.label}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

function Donation() {
  const { user, profile } = useAuth();

  // Phone number auto-formatter (e.g. 081-234-5678 or 02-123-4567)
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

  // State variables
  const [billingCycle, setBillingCycle] = useState('once'); // 'once' or 'monthly'
  const [selectedMoneyTier, setSelectedMoneyTier] = useState(1); // index 0, 1, 2, 3, 4 (custom)
  const [customAmount, setCustomAmount] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'payment', 'items', 'report'
  const [activeMobileTab, setActiveMobileTab] = useState('money'); // 'money' | 'items' | 'report'
  
  // Incident Report Form States
  const [reportStep, setReportStep] = useState(1);
  const [animalType, setAnimalType] = useState('dog');
  const [symptoms, setSymptoms] = useState('');
  const [locationText, setLocationText] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  // Payment Slip States
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Success states
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Real-time Total Donations & Incident Stats
  const [totalDonations, setTotalDonations] = useState(0);
  const [incidentStats, setIncidentStats] = useState({ inProgress: 0, resolved: 0 });
  const [foundations, setFoundations] = useState([]);
  const [selectedFoundationId, setSelectedFoundationId] = useState('');
  const [loadingFoundations, setLoadingFoundations] = useState(true);

  const foundationOptions = foundations.length > 0
    ? foundations.map(f => ({ value: f.id, label: f.full_name }))
    : [{ value: '', label: loadingFoundations ? 'กำลังโหลดรายชื่อมูลนิธิ...' : 'ไม่พบรายชื่อมูลนิธิ' }];

  useEffect(() => {
    const fetchTotal = async () => {
      const total = await api.getDonationTotal();
      setTotalDonations(total);
    };
    fetchTotal();
  }, [paymentSuccess]);

  useEffect(() => {
    let channel = null;
    const fetchStats = async () => {
      const stats = await api.getIncidentStats();
      setIncidentStats(stats);
    };
    fetchStats();

    if (supabase) {
      channel = supabase
        .channel('realtime_incident_stats')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'incident_reports' },
          () => {
            fetchStats();
          }
        )
      .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [reportSuccess]);

  useEffect(() => {
    let isMounted = true;
    const fetchFoundations = async () => {
      setLoadingFoundations(true);
      try {
        const data = await api.getFoundations();
        if (isMounted) {
          setFoundations(data || []);
          if (data && data.length > 0) {
            setSelectedFoundationId(prev => (prev && data.some(f => f.id === prev)) ? prev : data[0].id);
          }
        }
      } catch (err) {
        console.warn('Error fetching foundations:', err);
      } finally {
        if (isMounted) setLoadingFoundations(false);
      }
    };
    fetchFoundations();
    return () => { isMounted = false; };
  }, []);

  const [foundationNeeds, setFoundationNeeds] = useState([]);
  const [loadingNeeds, setLoadingNeeds] = useState(false);

  useEffect(() => {
    let channel = null;
    const fetchNeeds = async () => {
      setLoadingNeeds(true);
      try {
        const data = await api.getFoundationNeeds(selectedFoundationId);
        setFoundationNeeds(data);
      } catch (err) {
        console.warn('Error fetching foundation needs:', err);
      } finally {
        setLoadingNeeds(false);
      }
    };
    fetchNeeds();

    if (supabase) {
      channel = supabase
        .channel(`realtime_donation_needs_${selectedFoundationId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foundation_needs' },
          () => {
            fetchNeeds();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedFoundationId]);

  // Donation Tier Data
  const tiers = {
    once: [
      { id: 1, amount: 100, title: 'อิ่มท้อง 3 มื้อ', desc: 'ช่วยสนับสนุนค่าอาหารเม็ดเกรดพรีเมียมให้สุนัขหรือแมวในศูนย์พักพิงอิ่มท้องได้ 3 วัน' },
      { id: 2, amount: 300, title: 'วัคซีนป้องกันโรค', desc: 'ช่วยสนับสนุนวัคซีนรวมป้องกันโรค ไข้หัด-ลำไส้อักเสบ และยาถ่ายพยาธิ 1 โดส' },
      { id: 3, amount: 500, title: 'สุขภาพแข็งแรง', desc: 'สนับสนุนค่าตรวจสุขภาพประจำปี ตรวจเลือด และค่ายารักษาโรคเบื้องต้น' },
      { id: 4, amount: 1000, title: 'ผ่าตัดฉุกเฉิน', desc: 'ร่วมสมทบทุนค่ารักษาพยาบาลเคสอุบัติเหตุฉุกเฉินและศัลยกรรมสัตว์เจ็บปวด' },
    ],
    monthly: [
      { id: 1, amount: 150, title: 'อุปถัมภ์น้องแมว', desc: 'ช่วยดูแลค่าอาหาร ทรายแมว และของเล่นให้น้องแมว 1 ตัว ตลอดทั้งเดือน' },
      { id: 2, amount: 350, title: 'อุปถัมภ์น้องหมา', desc: 'ช่วยดูแลค่าอาหารแสนอร่อย ยาป้องกันเห็บหมัด แชมพูอาบน้ำสุนัข 1 ตัว ทั้งเดือน' },
      { id: 3, amount: 600, title: 'ผู้พิทักษ์ 4 ขา', desc: 'ช่วยสมทบทุนค่าอาหารและยาป้องกันโรคแก่สัตว์ป่วยไร้บ้านในเขตความรับผิดชอบ' },
      { id: 4, amount: 1200, title: 'นางฟ้า/เทวดาประจำศูนย์', desc: 'ร่วมผลักดันระบบการทำหมันสัตว์จรจัดเชิงรุกเพื่อลดปัญหาสัตว์จรจัดในระยะยาว' },
    ]
  };

  const currentTiers = tiers[billingCycle];
  const activeTierObj = selectedMoneyTier < 4 ? currentTiers[selectedMoneyTier] : null;
  const currentAmount = selectedMoneyTier < 4 ? activeTierObj.amount : Number(customAmount) || 0;

  // Handle address copy
  const handleCopyAddress = () => {
    const found = foundations.find(f => f.id === selectedFoundationId);
    const addressText = `ผู้รับ: ${found?.full_name || 'มูลนิธิ'} ที่อยู่: ${found?.address || 'กรุณาติดต่อสอบถามที่อยู่จัดส่งจากมูลนิธิโดยตรง'} โทร. ${found?.phone || '-'}`;
    navigator.clipboard.writeText(addressText);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Reset states
  const openModal = (type) => {
    setActiveModal(type);
    setPaymentSuccess(false);
    setReportSuccess(false);
    setReportStep(1);
    // Clear form with profile prefill if available
    setSymptoms('');
    setLocationText('');
    setReporterName(profile?.full_name || '');
    setReporterPhone(profile?.phone ? formatPhoneNumber(profile.phone) : '');
    setSelectedImage(null);
    setImageFile(null);
    setCoordinates(null);
    setIsGettingLocation(false);
    setIsSubmittingReport(false);
    setSlipFile(null);
    setSlipPreview(null);
    setIsSubmittingPayment(false);
  };

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setSelectedImage(URL.createObjectURL(file));
    }
  };

  const handleSearchLocation = async () => {
    const query = locationText.trim();
    if (!query) {
      alert('กรุณากรอกชื่อสถานที่หรือที่อยู่ก่อนกดค้นหาพิกัด');
      return;
    }
    setIsSearchingLocation(true);
    try {
      const geoResult = await searchCoordinatesFromAddress(query);
      if (geoResult) {
        setCoordinates({ latitude: geoResult.latitude, longitude: geoResult.longitude });
      } else {
        alert('ไม่พบพิกัดจากสถานที่นี้ กรุณาระบุชื่อตำบล อำเภอ หรือจังหวัดให้ชัดเจน หรือกดดึงพิกัด GPS อัตโนมัติ');
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoordinates({ latitude, longitude });

        let resolvedAddress = '';
        try {
          const rev = await getAddressFromCoordinates(latitude, longitude);
          if (rev && rev.formattedAddress) {
            resolvedAddress = rev.formattedAddress;
          }
        } catch (e) {
          console.warn('Reverse geocode error:', e);
        }

        if (resolvedAddress) {
          setLocationText(resolvedAddress);
        } else {
          setLocationText(`พิกัด GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        setIsGettingLocation(false);
      },
      (err) => {
        setIsGettingLocation(false);
        console.warn('Geolocation error:', err);
        alert('ไม่สามารถดึงพิกัดอัตโนมัติได้ กรุณาพิมพ์สถานที่พบเห็นด้วยตนเอง');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!symptoms.trim() || !locationText.trim()) {
      alert('กรุณากรอกอาการและสถานที่พบเห็น');
      return;
    }
    const cleanPhone = reporterPhone.replace(/\D/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 10) {
      alert('กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (9 หรือ 10 หลัก)');
      return;
    }
    setIsSubmittingReport(true);
    try {
      await api.submitIncidentReport({
        userId: user?.id,
        animalType,
        symptoms,
        locationText,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        reporterName,
        reporterPhone
      }, imageFile);
      setReportSuccess(true);
    } catch (err) {
      console.error('Report submit error:', err);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleSlipSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
    }
  };

  const removeSlip = () => {
    setSlipFile(null);
    setSlipPreview(null);
  };

  const handlePaymentConfirm = async () => {
    if (!slipFile) {
      alert('กรุณาแนบภาพสลิปหลักฐานการโอนเงิน PromptPay ก่อนกดยืนยัน');
      return;
    }

    if (!user) {
      alert('กรุณาเข้าสู่ระบบก่อนทำรายการบริจาค');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      // 1. อัปโหลดภาพสลิปขึ้น Storage
      const slipUrl = await api.uploadDonationSlip(slipFile);
      if (!slipUrl) {
        throw new Error('ไม่สามารถอัปโหลดภาพสลิปได้ กรุณาลองใหม่อีกครั้ง');
      }

      // 2. บันทึกข้อมูลด้วยสถานะ pending_verification (รอเจ้าหน้าที่ตรวจสอบสลิปก่อนนับยอดจริง)
      if (supabase) {
        const { error: insertErr } = await supabase.from('donations').insert([
          {
            user_id: user.id,
            amount: currentAmount,
            billing_cycle: billingCycle,
            status: 'pending_verification',
            slip_url: slipUrl,
            foundation_id: selectedFoundationId || null
          }
        ]);
        if (insertErr) throw insertErr;
      }
      setPaymentSuccess(true);
    } catch (error) {
      console.error("Error saving donation:", error);
      alert(error.message || 'ไม่สามารถบันทึกข้อมูลการบริจาคได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <div className="page-container donation-page">
      {/* Hero Banner */}
      <motion.div 
        className="donation-hero fade-in-up"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="hero-emoji" style={{ background: 'transparent', boxShadow: 'none', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PiggyBank size={32} color="#D97706" />
          </div>
        </div>
        <h1 className="page-title hero-title">สนับสนุนโครงการและแจ้งขอความช่วยเหลือ</h1>
        <p className="hero-subtitle">
          ร่วมส่งต่อความรักและความช่วยเหลือให้กับพวกพ้อง 4 ขาจรจัด <br className="hidden md:block" />
          เพื่อช่วยให้พวกเขามีชีวิตใหม่ ร่างกายแข็งแรง และพร้อมรอคอยบ้านที่อบอุ่น
        </p>
      </motion.div>

      {/* Mobile Segmented Tabs (< 1024px) */}
      <div className="mobile-donation-tabs">
        <button 
          type="button"
          className={`mobile-tab-btn ${activeMobileTab === 'money' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('money')}
        >
          <Heart size={15} fill={activeMobileTab === 'money' ? 'currentColor' : 'none'} />
          <span>บริจาคเงิน</span>
        </button>
        <button 
          type="button"
          className={`mobile-tab-btn ${activeMobileTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('items')}
        >
          <Package size={15} />
          <span>บริจาคของใช้</span>
        </button>
        <button 
          type="button"
          className={`mobile-tab-btn report-tab ${activeMobileTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('report')}
        >
          <AlertTriangle size={15} />
          <span>แจ้งเบาะแส</span>
        </button>
      </div>

      {/* Grid Layout of Donation Cards */}
      <div className="donation-grid">
        
        {/* CARD 1: DONATE MONEY */}
        <motion.div 
          className={`donation-card-premium ${activeMobileTab !== 'money' ? 'mobile-hidden' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="card-header-premium bg-primary-gradient">
            <div className="icon-badge">
              <Heart size={24} color="var(--primary)" fill="var(--primary)" />
            </div>
            <div className="card-header-titles">
              <span className="premium-tag">การช่วยชีวิต</span>
              <h2>บริจาคเงินช่วยเหลือ</h2>
            </div>
          </div>
          
          <div className="premium-card-body">
            <p className="description-text">สนับสนุนค่ารักษาพยาบาล ค่าอาหาร ยา และวัคซีนสัตว์ป่วยในศูนย์พักพิง</p>
            
            {/* Foundation Selector inside Card 1 */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', marginBottom: '6px' }}>
                เลือกมูลนิธิที่ต้องการบริจาคให้:
              </label>
              <CustomDropdown 
                options={foundationOptions}
                value={selectedFoundationId}
                onChange={setSelectedFoundationId}
              />
            </div>

            {/* Fundraising Progress */}
            <div className="progress-card-section">
              <div className="progress-details" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span className="progress-title-text"><TrendingUp size={14} className="text-primary" /> ยอดระดมทุนช่วยเหลือสัปดาห์นี้</span>
                <span className="progress-percentage" style={{ marginLeft: 'auto' }}>
                  {Math.min(100, Math.round((totalDonations / 100000) * 100))}% ({totalDonations.toLocaleString()} / 100,000 ฿)
                </span>
              </div>
              <div className="progress-bar-bg-premium">
                <motion.div 
                  className="progress-bar-fill-premium"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (totalDonations / 100000) * 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Donation Grid Tiers */}
            <div className="donation-tiers-grid">
              {currentTiers.map((tier, index) => (
                <button
                  key={tier.id}
                  className={`tier-button ${selectedMoneyTier === index ? 'selected' : ''}`}
                  onClick={() => setSelectedMoneyTier(index)}
                >
                  <span className="tier-amount">{tier.amount} ฿</span>
                  <span className="tier-label">{tier.title}</span>
                </button>
              ))}
              <button
                className={`tier-button custom-tier ${selectedMoneyTier === 4 ? 'selected' : ''}`}
                onClick={() => setSelectedMoneyTier(4)}
              >
                <span className="tier-amount">กำหนดเอง</span>
                <span className="tier-label">ระบุจำนวนเงิน</span>
              </button>
            </div>

            {/* Selected Impact Description */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={`${billingCycle}-${selectedMoneyTier}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="tier-impact-box"
              >
                {selectedMoneyTier < 4 ? (
                  <>
                    <div className="impact-header">
                      <span className="impact-badge"><ShieldCheck size={14} /> ผลลัพธ์จากการสนับสนุน</span>
                      <strong>฿ {currentTiers[selectedMoneyTier].amount}</strong>
                    </div>
                    <p className="impact-desc-text">{currentTiers[selectedMoneyTier].desc}</p>
                  </>
                ) : (
                  <div className="custom-amount-input-container">
                    <span className="currency-symbol">฿</span>
                    <input 
                      type="number"
                      placeholder="ระบุจำนวนเงิน (เช่น 200)"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="custom-input-field"
                      min="1"
                      step="1"
                    />
                    <span className="input-helper">ขั้นต่ำ 1 บาท</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <button 
              className="btn btn-primary btn-full premium-action-btn"
              onClick={() => openModal('payment')}
              disabled={selectedMoneyTier === 4 && (!customAmount || Number(customAmount) < 1)}
            >
              บริจาคช่วยเหลือจำนวน ฿ {currentAmount.toLocaleString()}
            </button>
          </div>
        </motion.div>

        {/* CARD 2: DONATE ITEMS */}
        <motion.div 
          className={`donation-card-premium ${activeMobileTab !== 'items' ? 'mobile-hidden' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="card-header-premium bg-secondary-gradient">
            <div className="icon-badge">
              <Package size={24} color="#059669" />
            </div>
            <div className="card-header-titles">
              <span className="premium-tag secondary-tag">สิ่งของจำเป็น</span>
              <h2>บริจาคของใช้ของแห้ง</h2>
            </div>
          </div>
          
          <div className="premium-card-body">
            <p className="description-text">ส่งมอบอาหารและเวชภัณฑ์ที่ศูนย์พักพิงกำลังขาดแคลน สั่งส่งพัสดุได้โดยตรง</p>

            {/* Foundation Selector inside Card 2 */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', marginBottom: '6px' }}>
                เลือกมูลนิธิที่ต้องการส่งของให้:
              </label>
              <CustomDropdown 
                options={foundationOptions}
                value={selectedFoundationId}
                onChange={setSelectedFoundationId}
              />
            </div>

            {/* Need Checklist items */}
            {loadingNeeds ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#6B7280' }}>
                <Loader className="spin" size={20} style={{ margin: '0 auto 8px' }} />
                <span style={{ fontSize: '0.82rem' }}>กำลังตรวจสอบรายการของที่ขาด...</span>
              </div>
            ) : foundationNeeds.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '10px', marginBottom: '14px' }}>
                <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>มูลนิธินี้ยังไม่มีรายการขอรับสิ่งของเพิ่มเติมในขณะนี้</p>
              </div>
            ) : (
              <div className="items-needed-list">
                {foundationNeeds.slice(0, 4).map(item => {
                  const urgencyConfig = {
                    critical: { label: 'วิกฤต', bg: '#FEE2E2', color: '#DC2626', barColor: '#DC2626', width: '90%' },
                    high: { label: 'ด่วนมาก', bg: '#FEF3C7', color: '#D97706', barColor: '#D97706', width: '65%' },
                    normal: { label: 'เปิดรับเรื่อยๆ', bg: '#ECFDF5', color: '#059669', barColor: '#059669', width: '40%' },
                    sufficient: { label: 'มีเพียงพอแล้ว', bg: '#F3F4F6', color: '#6B7280', barColor: '#9CA3AF', width: '100%' }
                  }[item.urgency] || { label: 'เปิดรับทั่วไป', bg: '#F3F4F6', color: '#4B5563', barColor: '#9CA3AF', width: '50%' };

                  return (
                    <div key={item.id} className="need-item">
                      <div className="need-info">
                        <span className="need-name">{item.item_name}</span>
                        <span 
                          className="need-urgency"
                          style={{
                            backgroundColor: urgencyConfig.bg,
                            color: urgencyConfig.color,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 600
                          }}
                        >
                          {urgencyConfig.label}
                        </span>
                      </div>
                      {item.note && (
                        <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', marginTop: '-2px', marginBottom: '4px' }}>
                          {item.note}
                        </span>
                      )}
                      <div className="need-progress-bar">
                        <div 
                          className="need-progress-fill" 
                          style={{ 
                            width: urgencyConfig.width, 
                            backgroundColor: urgencyConfig.barColor 
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="alert-box-info" style={{ marginTop: '12px' }}>
              <Info size={16} className="text-secondary-dark" />
              <span>สั่งผ่าน Shopee / Lazada แล้วใส่ที่อยู่จัดส่งตรงของมูลนิธิได้เลย</span>
            </div>

            <button 
              className="btn btn-secondary btn-full premium-action-btn"
              onClick={() => openModal('items')}
            >
              ดูรายการสิ่งของ & ที่อยู่จัดส่ง
            </button>
          </div>
        </motion.div>

        {/* CARD 3: REPORT STRAY ANIMAL */}
        <motion.div 
          id="report-card-section"
          className={`donation-card-premium ${activeMobileTab !== 'report' ? 'mobile-hidden' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="card-header-premium bg-danger-gradient">
            <div className="icon-badge">
              <AlertTriangle size={26} color="var(--danger)" />
            </div>
            <div className="card-header-titles">
              <span className="premium-tag danger-tag">หน่วยกู้ภัย</span>
              <h2>แจ้งเบาะแสสัตว์จรจัด</h2>
            </div>
          </div>
          
          <div className="premium-card-body">
            <p className="description-text">พบเจอสุนัขหรือแมวป่วย บาดเจ็บ โดนทิ้ง หรือต้องการการช่วยเหลือเร่งด่วนในพื้นที่</p>

            <div className="case-tracker-box">
              <div className="tracker-header">
                <h3>สถิติการช่วยเหลือสัปดาห์นี้</h3>
                <span className="tracker-badge">อัปเดตเรียลไทม์</span>
              </div>
              <div className="tracker-stats-grid">
                <div className="tracker-stat">
                  <span className="stat-num text-danger">{incidentStats.inProgress}</span>
                  <span className="stat-desc">กำลังดำเนินการ</span>
                </div>
                <div className="tracker-stat">
                  <span className="stat-num text-success">{incidentStats.resolved}</span>
                  <span className="stat-desc">เคสช่วยสำเร็จ</span>
                </div>
              </div>
            </div>

            <div className="report-rules">
              <div className="rule-step">
                <div className="step-num">1</div>
                <div className="step-text">ถ่ายภาพและบันทึกอาการ</div>
              </div>
              <div className="rule-step">
                <div className="step-num">2</div>
                <div className="step-text">ปักหมุดพิกัดเพื่อนำทาง</div>
              </div>
              <div className="rule-step">
                <div className="step-num">3</div>
                <div className="step-text">ส่งข้อมูลเพื่อให้ทีมงานกู้ชีพเข้าพื้นที่</div>
              </div>
            </div>

            <button 
              className="btn btn-danger btn-full premium-action-btn"
              style={{ background: 'var(--danger)', color: '#fff' }}
              onClick={() => openModal('report')}
            >
              แจ้งเบาะแสและพิกัดช่วยเหลือ
            </button>
          </div>
        </motion.div>

      </div>

      {/* ALL MODALS COMPONENT */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            className="modal-backdrop" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setActiveModal(null)}
          >
            {/* Backdrop inner content wrapper to stop propagation */}
            <motion.div 
              className="modal-container"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button aria-label="Close modal" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={20} />
              </button>

              {/* MODAL CONTENT 1: MONEY PAYMENT (PROMPTPAY) */}
              {activeModal === 'payment' && (
                <div className="modal-inner">
                  {!paymentSuccess ? (
                    <>
                      <h2 className="modal-title">บริจาคสนับสนุนโครงการช่วยเหลือ</h2>
                      <p className="modal-subtitle">ยอดบริจาคของคุณจะถูกนำไปดูแลสัตว์เลี้ยงที่ยากไร้โดยทันที</p>
                      
                      <div className="payment-summary-slip">
                        <div className="slip-row">
                          <span>ประเภทการบริจาค:</span>
                          <strong>{billingCycle === 'once' ? 'บริจาคแบบครั้งเดียว' : 'อุปถัมภ์รายเดือนต่อเนื่อง'}</strong>
                        </div>
                        <div className="slip-row">
                          <span>วัตถุประสงค์:</span>
                          <span>{selectedMoneyTier < 4 ? currentTiers[selectedMoneyTier].title : 'ช่วยเหลือสัตว์ป่วย/จรจัดตามความต้องการ'}</span>
                        </div>
                        <div className="slip-row highlight">
                          <span>จำนวนเงินบริจาค:</span>
                          <strong className="text-primary">฿ {currentAmount.toLocaleString()}.00</strong>
                        </div>
                        <div className="slip-row" style={{ alignItems: 'center' }}>
                          <span>บริจาคให้:</span>
                          <div style={{ flex: 1, maxWidth: '65%' }}>
                            <CustomDropdown 
                              options={foundationOptions}
                              value={selectedFoundationId} 
                              onChange={setSelectedFoundationId}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Promtpay Layout */}
                      <div className="promptpay-wrapper">
                        <div className="promptpay-header">
                          <span className="pp-logo-text">Prompt Pay</span>
                          <span className="pp-sub">Thai QR Payment</span>
                        </div>
                        <div className="promptpay-body">
                          {/* QR Code Container with scan lines */}
                          <div className="qr-box-frame" style={{ background: '#fff', padding: '10px' }}>
                            <QRCodeSVG 
                              value={generatePayload(
                                (foundations.find(f => f.id === selectedFoundationId)?.promptpay_number?.replace(/\D/g, '') 
                                 || foundations.find(f => f.id === selectedFoundationId)?.phone?.replace(/\D/g, '') 
                                 || "0000000000"), 
                                { amount: currentAmount }
                              )} 
                              size={180} 
                            />
                          </div>

                          {/* Recipient Details */}
                          <div style={{
                            marginTop: '12px',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            textAlign: 'center',
                            border: '1px solid #E5E7EB',
                            width: '100%',
                            maxWidth: '300px'
                          }}>
                            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#111827' }}>
                              {foundations.find(f => f.id === selectedFoundationId)?.full_name || 'มูลนิธิที่เลือก'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#4B5563', marginTop: '2px' }}>
                              พร้อมเพย์: <strong style={{ color: '#D97706' }}>
                                {foundations.find(f => f.id === selectedFoundationId)?.promptpay_number 
                                 || foundations.find(f => f.id === selectedFoundationId)?.phone 
                                 || 'ยังไม่ได้ระบุ'}
                              </strong>
                            </div>
                          </div>

                          <span className="pp-id-label" style={{ marginTop: '10px' }}>สแกนรหัสเพื่อทำรายการ</span>
                          <div className="pp-disclaimer">สแกนเพื่อบริจาคเงินผ่านพร้อมเพย์เข้าบัญชีมูลนิธิโดยตรง</div>
                        </div>
                      </div>

                      {/* Payment Slip Upload */}
                      <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--gray-50)', borderRadius: '12px', border: slipFile ? '1.5px solid #10B981' : '1px dashed var(--gray-300)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '8px' }}>
                          <span>แนบหลักฐานการโอนเงิน (สลิป PromptPay) <span style={{ color: '#DC2626' }}>*จำเป็น</span></span>
                          {slipFile && <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>แนบสลิปแล้ว</span>}
                        </label>
                        {slipPreview ? (
                          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '160px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #D1D5DB', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                            <img src={slipPreview} alt="Slip Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                            <button 
                              type="button" 
                              onClick={removeSlip}
                              title="ลบสลิปเพื่อเลือกใหม่"
                              style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.65)', color: 'white', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: 'white', border: '1.5px dashed #D97706', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', color: '#B45309', width: 'fit-content' }}>
                            <Upload size={18} color="#D97706" />
                            <span style={{ fontWeight: 600 }}>คลิกเพื่ออัปโหลดภาพสลิปการโอน</span>
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSlipSelect} />
                          </label>
                        )}
                        <span style={{ display: 'block', fontSize: '0.78rem', color: slipFile ? '#059669' : '#DC2626', marginTop: '8px', fontWeight: 500 }}>
                          {slipFile ? 'แนบสลิปเรียบร้อย พร้อมกดยืนยันการโอน' : '* กรุณาสแกน QR และแนบสลิปโอนเงิน เพื่อให้เจ้าหน้าที่ตรวจสอบความถูกต้องก่อนบันทึกยอด'}
                        </span>
                      </div>

                      <div className="modal-buttons-row" style={{ marginTop: '20px' }}>
                        <button className="btn btn-secondary" disabled={isSubmittingPayment} onClick={() => setActiveModal(null)}>ยกเลิก</button>
                        <button 
                          className="btn btn-primary" 
                          disabled={!slipFile || isSubmittingPayment} 
                          onClick={handlePaymentConfirm}
                          style={{
                            opacity: !slipFile ? 0.6 : 1,
                            cursor: !slipFile ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {isSubmittingPayment ? (
                            <>
                              <Loader className="spin" size={16} /> กำลังอัปโหลดสลิป...
                            </>
                          ) : !slipFile ? (
                            <>
                              <Upload size={16} /> กรุณาแนบสลิปก่อนยืนยัน
                            </>
                          ) : (
                            <>
                              <Check size={16} /> ยืนยันการโอนเงิน (แนบสลิปแล้ว)
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <motion.div 
                      className="success-state-container"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <div className="success-icon-wrapper-glow" style={{ background: 'transparent' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                          <Check size={40} color="#059669" />
                        </div>
                      </div>
                      <h2 className="success-title">ส่งหลักฐานการบริจาคเรียบร้อยแล้ว!</h2>
                      <div style={{ margin: '12px auto 16px', maxWidth: '380px', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: '0.825rem', textAlign: 'left', lineHeight: 1.5 }}>
                        <strong>สถานะ: รอการตรวจสอบสลิป (Pending Verification)</strong><br />
                        ข้อมูลและสลิปการโอนเงินถูกส่งไปยังเจ้าหน้าที่/มูลนิธิเรียบร้อยแล้ว เมื่อเจ้าหน้าที่ตรวจสอบความถูกต้อง ยอดบริจาคจะถูกบันทึกสมทบเข้าสู่ยอดระดมทุนโครงการอย่างเป็นทางการ
                      </div>
                      <p className="success-desc">
                        ยอดบริจาคจำนวน <strong>฿ {currentAmount.toLocaleString()}.00</strong>
                        <br />
                        ขออนุโมทนาและขอบพระคุณในความเมตตาที่มีต่อเพื่อนสี่ขาเป็นอย่างสูงครับ/ค่ะ
                      </p>
                      <button className="btn btn-primary" style={{ minWidth: '150px' }} onClick={() => setActiveModal(null)}>
                        ปิดหน้าต่าง
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

              {/* MODAL CONTENT 2: SHIPPING ITEMS */}
              {activeModal === 'items' && (
                <div className="modal-inner">
                  <h2 className="modal-title">ที่อยู่สำหรับจัดส่งสิ่งของบริจาค</h2>
                  <p className="modal-subtitle">สามารถส่งตรงผ่านที่อยู่นี้ได้โดยใช้ขนส่งทุกค่าย (Flash, J&T, Kerry, ไปรษณีย์ไทย)</p>

                  <div className="shipping-address-card">
                    <div className="address-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <strong>ที่อยู่จัดส่งสิ่งของบริจาค</strong>
                        <button 
                          className={`copy-address-btn ${copiedAddress ? 'copied' : ''}`}
                          onClick={handleCopyAddress}
                        >
                          {copiedAddress ? <Check size={14} /> : <Copy size={14} />}
                          {copiedAddress ? 'คัดลอกแล้ว' : 'คัดลอกที่อยู่'}
                        </button>
                      </div>
                      
                      <div className="slip-row" style={{ alignItems: 'center', width: '100%' }}>
                        <span>บริจาคให้:</span>
                        <div style={{ flex: 1 }}>
                          <CustomDropdown 
                            options={foundationOptions}
                            value={selectedFoundationId} 
                            onChange={setSelectedFoundationId}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="address-content-box">
                      <p><strong>ผู้รับ:</strong> {foundations.find(f => f.id === selectedFoundationId)?.full_name || 'มูลนิธิที่เลือก'}</p>
                      <p><strong>ที่อยู่:</strong> {foundations.find(f => f.id === selectedFoundationId)?.address || 'กรุณาติดต่อสอบถามที่อยู่จัดส่งจากมูลนิธิโดยตรง'}</p>
                      <p><strong>เบอร์โทรศัพท์:</strong> {foundations.find(f => f.id === selectedFoundationId)?.phone || '-'}</p>
                    </div>
                  </div>

                  <div className="shipping-guide-box">
                    <h3>คำแนะนำสำหรับการส่งของช่วยเหลือ</h3>
                    <ul>
                      <li><strong>อาหารสัตว์เลี้ยง:</strong> ขอความกรุณาเป็นแบบถุงปิดสนิท ไม่ชำรุดเสียหาย เพื่อความสะอาดและสุขอนามัย</li>
                      <li><strong>แผ่นรองซับและทรายแมว:</strong> ชนิดซึมซับสูงและเก็บกลิ่นได้ดีช่วยให้ทีมงานดูแลได้สะดวกรวดเร็วยิ่งขึ้น</li>
                      <li><strong>ยาและเวชภัณฑ์:</strong> กรุณาตรวจสอบวันหมดอายุก่อนทำการจัดส่ง</li>
                    </ul>
                  </div>

                  <div className="modal-buttons-row">
                    <button className="btn btn-primary btn-full" onClick={() => setActiveModal(null)}>
                      รับทราบและตกลง
                    </button>
                  </div>
                </div>
              )}

              {/* MODAL CONTENT 3: REPORT STRAY ANIMAL */}
              {activeModal === 'report' && (
                <div className="modal-inner">
                  {!reportSuccess ? (
                    <form onSubmit={handleReportSubmit} className="report-multi-step-form">
                      <h2 className="modal-title">แจ้งกู้ภัยกู้ชีพสัตว์จรจัด</h2>
                      <p className="modal-subtitle">โปรดแจ้งข้อมูลเบื้องต้นและพิกัดเพื่อให้เจ้าหน้าที่อาสาวางแผนเข้าช่วยเหลือได้ถูกต้อง</p>

                      {/* Steps Progress Header */}
                      <div className="form-steps-indicator">
                        <div className={`form-step-dot ${reportStep >= 1 ? 'active' : ''}`}>1. ข้อมูลสัตว์</div>
                        <div className="step-dot-line" />
                        <div className={`form-step-dot ${reportStep >= 2 ? 'active' : ''}`}>2. พิกัดและภาพ</div>
                        <div className="step-dot-line" />
                        <div className={`form-step-dot ${reportStep >= 3 ? 'active' : ''}`}>3. ข้อมูลผู้แจ้ง</div>
                      </div>

                      {/* Step 1 Content: Animal Info */}
                      {reportStep === 1 && (
                        <motion.div 
                          className="step-body"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          <div className="form-group">
                            <label className="form-label">ประเภทของสัตว์ที่พบเจอ</label>
                            <div className="animal-type-select-grid">
                              <button 
                                type="button" 
                                className={`type-btn-select ${animalType === 'dog' ? 'selected' : ''}`}
                                onClick={() => setAnimalType('dog')}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <Dog size={16} /> สุนัข
                              </button>
                              <button 
                                type="button" 
                                className={`type-btn-select ${animalType === 'cat' ? 'selected' : ''}`}
                                onClick={() => setAnimalType('cat')}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <Cat size={16} /> แมว
                              </button>
                              <button 
                                type="button" 
                                className={`type-btn-select ${animalType === 'other' ? 'selected' : ''}`}
                                onClick={() => setAnimalType('other')}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <Heart size={16} /> สัตว์ประเภทอื่น
                              </button>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label">อาการหรือลักษณะของสัตว์ (เช่น บาดเจ็บหนัก, ถูกมัดทิ้งไว้, ป่วยซูบผอม)</label>
                            <textarea 
                              className="form-textarea-input"
                              placeholder="เช่น สุนัขเพศผู้ มีแผลลึกกว้างบริเวณข้อเท้าหลังด้านขวา เดินกะเผลก มีอาการระแวงคนมาก..."
                              rows={4}
                              value={symptoms}
                              onChange={(e) => setSymptoms(e.target.value)}
                              required
                            />
                          </div>

                          <div className="modal-buttons-row">
                            <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>ยกเลิก</button>
                            <button 
                              type="button" 
                              className="btn btn-primary"
                              disabled={!symptoms.trim()}
                              onClick={() => setReportStep(2)}
                            >
                              ขั้นตอนถัดไป <ChevronRight size={16} />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 2 Content: Location & Image */}
                      {reportStep === 2 && (
                        <motion.div 
                          className="step-body"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          <div className="form-group">
                            <label className="form-label">ระบุพิกัดสถานที่พบเจอ (อธิบายจุดสังเกตเด่นๆ)</label>
                            <input 
                              type="text" 
                              className="form-text-input" 
                              placeholder="เช่น หลังตึกแถวตลาดกลาง ซอย 3 ข้างเสาไฟต้นใหญ่"
                              value={locationText}
                              onChange={(e) => setLocationText(e.target.value)}
                              required
                            />
                            <div className="map-button-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                              <button 
                                type="button" 
                                className="btn btn-secondary btn-sm" 
                                style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={handleGetLocation}
                                disabled={isGettingLocation}
                              >
                                {isGettingLocation ? <Loader className="spin" size={14} /> : <MapPin size={14} color="var(--primary)" />}
                                {isGettingLocation ? 'กำลังดึงพิกัด...' : 'ใช้พิกัดปัจจุบัน'}
                              </button>

                              <button 
                                type="button" 
                                className="btn btn-secondary btn-sm" 
                                style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={handleSearchLocation}
                                disabled={isSearchingLocation || !locationText.trim()}
                              >
                                {isSearchingLocation ? <Loader className="spin" size={14} /> : <Search size={14} color="var(--primary)" />}
                                {isSearchingLocation ? 'กำลังค้นหา...' : 'ค้นหาตำแหน่งจากข้อความนี้'}
                              </button>
                            </div>

                            {/* Google Maps Preview for Reporter */}
                            {coordinates && (
                              <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #fed7aa', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                <iframe
                                  title="Google Maps Location"
                                  width="100%"
                                  height="150"
                                  style={{ border: 0, display: 'block' }}
                                  loading="lazy"
                                  src={`https://maps.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}&z=16&output=embed`}
                                />
                                <div style={{ padding: '8px 12px', background: '#fffaf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #ffedd5' }}>
                                  <div style={{ fontSize: '0.8rem', color: '#78716c', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                                    <MapPin size={15} color="#ea580c" />
                                    <span>พิกัด GPS: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => window.open(`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`, '_blank')}
                                    style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ea580c', background: '#ffedd5', border: 'none', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <span>เปิดใน Google Maps</span>
                                    <ExternalLink size={12} />
                                  </button>
                                </div>
                              </div>
                            )}
                            {!coordinates && locationText.trim() && (
                              <div style={{ marginTop: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`, '_blank')}
                                  style={{ fontSize: '0.8rem', color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <MapPin size={13} />
                                  <span>ตรวจสอบพิกัดนี้บน Google Maps</span>
                                  <ExternalLink size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="form-group">
                            <label className="form-label">ภาพถ่ายสถานการณ์ (ถ้ามี เพื่อช่วยประเมินการเข้าพื้นที่)</label>
                            <div className="image-uploader-box">
                              {selectedImage ? (
                                <div className="uploaded-preview-container">
                                  <img loading="lazy" src={selectedImage} alt="Animal Preview" className="uploaded-image-preview" />
                                  <button aria-label="Remove image" type="button" className="delete-image-btn" onClick={() => { setSelectedImage(null); setImageFile(null); }}>
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <label className="upload-placeholder-label">
                                  <Camera size={28} className="text-light" />
                                  <span>คลิกเลือกรูปภาพ</span>
                                  <span style={{ fontSize: 'var(--typography-label-fontSize)', color: 'var(--text-light)' }}>รองรับ JPG, PNG (สูงสุด 5MB)</span>
                                  <input type="file" accept="image/*" className="hidden-file-input" onChange={handleImageUpload} />
                                </label>
                              )}
                            </div>
                          </div>

                          <div className="modal-buttons-row">
                            <button type="button" className="btn btn-secondary" onClick={() => setReportStep(1)}>ย้อนกลับ</button>
                            <button 
                              type="button" 
                              className="btn btn-primary"
                              disabled={!locationText.trim()}
                              onClick={() => setReportStep(3)}
                            >
                              ขั้นตอนถัดไป <ChevronRight size={16} />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3 Content: Contact Info */}
                      {reportStep === 3 && (
                        <motion.div 
                          className="step-body"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          <div className="form-group">
                            <label className="form-label" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                              ชื่อผู้แจ้งเหตุช่วยเหลือ (สำหรับประสานงาน) <span style={{ color: '#DC2626' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                              <input 
                                type="text" 
                                className="form-text-input" 
                                style={{
                                  width: '100%',
                                  height: '44px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '8px',
                                  padding: '0 14px 0 42px',
                                  fontSize: '0.95rem',
                                  color: '#111827',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.15s, box-shadow 0.15s'
                                }}
                                onFocus={e => {
                                  e.target.style.borderColor = 'var(--primary)';
                                  e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.12)';
                                }}
                                onBlur={e => {
                                  e.target.style.borderColor = '#D1D5DB';
                                  e.target.style.boxShadow = 'none';
                                }}
                                placeholder="เช่น สมชาย ใจดี"
                                value={reporterName}
                                onChange={(e) => setReporterName(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                              เบอร์โทรติดต่อกลับ (เพื่อสอบถามเส้นทางเมื่อถึงพื้นที่) <span style={{ color: '#DC2626' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                              <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                              <input 
                                type="tel" 
                                className="form-text-input" 
                                style={{
                                  width: '100%',
                                  height: '44px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '8px',
                                  padding: '0 14px 0 42px',
                                  fontSize: '0.95rem',
                                  color: '#111827',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.15s, box-shadow 0.15s'
                                }}
                                onFocus={e => {
                                  e.target.style.borderColor = 'var(--primary)';
                                  e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.12)';
                                }}
                                onBlur={e => {
                                  e.target.style.borderColor = '#D1D5DB';
                                  e.target.style.boxShadow = 'none';
                                }}
                                placeholder="เช่น 0812345678 หรือ 021234567"
                                value={reporterPhone}
                                onChange={(e) => setReporterPhone(formatPhoneNumber(e.target.value))}
                                maxLength={12}
                                required
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                              พิมพ์เฉพาะตัวเลขได้ ระบบจะจัดรูปแบบขีด (-) ให้อัตโนมัติ
                            </span>
                          </div>

                          <div className="modal-buttons-row">
                            <button type="button" className="btn btn-secondary" disabled={isSubmittingReport} onClick={() => setReportStep(2)}>ย้อนกลับ</button>
                            <button 
                              type="submit" 
                              className="btn btn-danger"
                              style={{ background: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                              disabled={!reporterName.trim() || !reporterPhone.trim() || isSubmittingReport}
                            >
                              {isSubmittingReport ? <Loader className="spin" size={16} /> : <Check size={16} />}
                              {isSubmittingReport ? 'กำลังส่งข้อมูล...' : 'ส่งรายงานเหตุช่วยเหลือฉุกเฉิน'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </form>
                  ) : (
                    <motion.div 
                      className="success-state-container"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <div className="success-icon-wrapper-glow bg-danger-glow" style={{ background: 'transparent' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255, 82, 82, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                          <AlertTriangle size={40} color="var(--danger)" />
                        </div>
                      </div>
                      <h2 className="success-title">รับแจ้งข้อมูลเหตุช่วยเหลือเรียบร้อย!</h2>
                      <p className="success-desc">
                        ข้อมูลการแจ้งเหตุสัตว์จรจัดได้รับเข้าระบบกู้ชีพจำลองแล้ว 
                        เจ้าหน้าที่อาสาในเขตอำเภอเมืองได้รับการกระตุ้นเตือนพิกัดแล้ว 
                        เราขอชื่นชมในความเมตตาและหัวใจฮีโร่ของคุณที่สังเกตและช่วยส่งเรื่องช่วยเหลือพวกเขา!
                      </p>
                      <button className="btn btn-primary" style={{ minWidth: '150px' }} onClick={() => setActiveModal(null)}>
                        ปิดหน้าต่าง
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default Donation;
