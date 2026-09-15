import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Package, 
  QrCode, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  ChevronRight, 
  Info,
  Sparkles,
  PiggyBank,
  Loader,
  Upload
} from 'lucide-react';

// Auth and DB
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';
import { DonationSkeleton } from '../components/Skeletons';

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

  // State variables
  const [billingCycle, setBillingCycle] = useState('once'); // 'once' or 'monthly'
  const [selectedMoneyTier, setSelectedMoneyTier] = useState(1); // index 0, 1, 2, 3, 4 (custom)
  const [customAmount, setCustomAmount] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'payment', 'items'
  const [activeMobileTab, setActiveMobileTab] = useState('money'); // 'money' | 'items'
  
  // Payment Slip States
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Success states
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [foundations, setFoundations] = useState([]);
  const [selectedFoundationId, setSelectedFoundationId] = useState('');
  const [loadingFoundations, setLoadingFoundations] = useState(true);

  const foundationOptions = foundations.length > 0
    ? foundations.map(f => ({ value: f.id, label: f.full_name }))
    : [{ value: '', label: loadingFoundations ? 'กำลังโหลดรายชื่อมูลนิธิ...' : 'ไม่พบรายชื่อมูลนิธิ' }];

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
    setSlipFile(null);
    setSlipPreview(null);
    setIsSubmittingPayment(false);
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

  if (loadingFoundations) {
    return <DonationSkeleton />;
  }

  return (
    <div className="page-container donation-page" style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 100px', width: '100%', boxSizing: 'border-box' }}>
      {/* Top Header Card */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          backgroundColor: '#FEF3C7',
          color: '#D97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <PiggyBank size={24} color="#D97706" />
        </div>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
            สนับสนุนโครงการและบริจาคช่วยเหลือ
          </h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
            ร่วมส่งต่อความรักและความช่วยเหลือให้กับพวกพ้อง 4 ขาจรจัดผ่านการบริจาคเงินหรือสิ่งของจำเป็น
          </p>
        </div>
      </div>

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
      </div>

      {/* Grid Layout of Donation Cards */}
      <div className="donation-grid">
        
        {/* CARD 1: DONATE MONEY */}
        <div className={`donation-card-premium ${activeMobileTab !== 'money' ? 'mobile-hidden' : ''}`}>
          <div className="card-header-premium">
            <div className="icon-badge" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <Heart size={22} fill="#D97706" />
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

            {/* Direct & Verified Foundation Guarantee */}
            <div style={{
              padding: '12px 14px',
              backgroundColor: '#F0FDF4',
              borderRadius: '12px',
              border: '1px solid #BBF7D0',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#15803D',
                marginTop: '1px'
              }}>
                <ShieldCheck size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14532D' }}>
                    โอนตรงเข้าบัญชีมูลนิธิ 100%
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    fontWeight: 600,
                    border: '1px solid #86EFAC'
                  }}>
                    บัญชีทางการที่ตรวจสอบแล้ว
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '4px', lineHeight: 1.45 }}>
                  เงินบริจาคจะเข้าบัญชีของ <strong>{foundations.find(f => f.id === selectedFoundationId)?.full_name || 'มูลนิธิที่เลือก'}</strong> โดยตรง ไม่ผ่านคนกลาง และไม่มีการหักค่าธรรมเนียมใดๆ
                </div>
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
            <div className="tier-impact-box">
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
            </div>

            <button 
              className="btn btn-primary btn-full premium-action-btn"
              onClick={() => openModal('payment')}
              disabled={selectedMoneyTier === 4 && (!customAmount || Number(customAmount) < 1)}
            >
              บริจาคช่วยเหลือจำนวน ฿ {currentAmount.toLocaleString()}
            </button>
          </div>
        </div>

        {/* CARD 2: DONATE ITEMS */}
        <div className={`donation-card-premium ${activeMobileTab !== 'items' ? 'mobile-hidden' : ''}`}>
          <div className="card-header-premium">
            <div className="icon-badge" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
              <Package size={22} color="#059669" />
            </div>
            <div className="card-header-titles">
              <span className="premium-tag secondary-tag">สิ่งของจำเป็น</span>
              <h2>บริจาคของใช้จำเป็น</h2>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0' }}>
                <div className="skeleton" style={{ height: '42px', borderRadius: '10px' }} />
                <div className="skeleton" style={{ height: '42px', borderRadius: '10px' }} />
                <div className="skeleton" style={{ height: '42px', borderRadius: '10px' }} />
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
        </div>

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
                          <strong>เงินบริจาคสมทบทุน (โอนตรง)</strong>
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

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default Donation;
