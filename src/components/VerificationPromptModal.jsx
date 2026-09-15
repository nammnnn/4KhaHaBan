import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, CheckCircle2, ArrowRight, X, Lock } from 'lucide-react';

export function VerificationPromptModal({ isOpen, onClose, fromPath = '/' }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToVerification = () => {
    onClose();
    navigate('/verify-user', {
      state: {
        from: fromPath,
        fromAction: 'swipe_match'
      }
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="verification-prompt-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(17, 24, 39, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box'
        }}
      >
        <motion.div
          className="verification-prompt-card"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #F3F4F6',
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '440px',
            overflow: 'hidden',
            fontFamily: 'Prompt, sans-serif',
            position: 'relative'
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#F3F4F6',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 0.15s ease'
            }}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>

          {/* Header Visual */}
          <div
            style={{
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              padding: '28px 24px 20px',
              textAlign: 'center',
              borderBottom: '1px solid #FDE68A'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: '#FFFFFF',
                color: '#D97706',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px -4px rgba(217, 119, 6, 0.2)',
                marginBottom: '14px',
                border: '1px solid rgba(217, 119, 6, 0.15)'
              }}
            >
              <ShieldCheck size={36} strokeWidth={2.2} />
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#1F2937',
                margin: '0 0 6px'
              }}
            >
              ยืนยันตัวตนเพื่อเริ่มปัด Match
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#92400E',
                margin: 0,
                lineHeight: 1.5,
                fontWeight: 500
              }}
            >
              กรอกข้อมูลและตอบแบบประเมินความพร้อม เพื่อส่งคำขอรับเลี้ยงน้องไปยังศูนย์พักพิง
            </p>
          </div>

          {/* Body Content */}
          <div style={{ padding: '20px 24px 24px' }}>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#4B5563',
                lineHeight: 1.6,
                margin: '0 0 16px'
              }}
            >
              เพื่อความปลอดภัยและความพร้อมของน้องสัตว์เลี้ยง ศูนย์พักพิงจำเป็นต้องทราบข้อมูลเบื้องต้นและผลการประเมินความพร้อมของผู้รับเลี้ยงก่อนเปิดห้องสนทนา
            </p>

            {/* Checklist Box */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                    1. ข้อมูลติดต่อเบื้องต้น
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                    ชื่อ-นามสกุล, เบอร์โทรศัพท์ และเลขบัตรประชาชน
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: '#FEF3C7',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <FileText size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                    2. ตอบแบบประเมินความพร้อม 5 ข้อ
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                    ที่อยู่อาศัย, เวลาดูแล, งบประมาณ และความเห็นชอบของครอบครัว
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <Lock size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                    ข้อมูลปลอดภัยและเป็นความลับ
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                    ส่งต่อให้เฉพาะศูนย์พักพิงที่ท่านส่งคำขอรับเลี้ยงเท่านั้น
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleGoToVerification}
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B45309')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D97706')}
              >
                <span>ไปกรอกข้อมูลและตอบแบบประเมิน</span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: 'transparent',
                  color: '#6B7280',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ไว้ภายหลัง
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
