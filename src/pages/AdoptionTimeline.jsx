import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Bell, 
  Camera, 
  Check, 
  ExternalLink, 
  X, 
  Loader2,
  Calendar,
  Send
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AdoptionTimelineSkeleton } from '../components/Skeletons';

export default function AdoptionTimeline() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState(null);
  const [animal, setAnimal] = useState(null);
  const [followupInfo, setFollowupInfo] = useState({ followups: [], milestones: [], nextDue: null });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const isFoundation = role === 'foundation' || role === 'super_admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const info = await api.getAdoptionFollowups(matchId);
      setFollowupInfo(info);

      if (info.match) {
        setMatchData(info.match);
        if (info.match.animal) {
          setAnimal(info.match.animal);
        } else if (info.match.animal_id) {
          const aData = await api.getAnimalById(info.match.animal_id);
          setAnimal(aData);
        }
      }
    } catch (err) {
      console.error('Error fetching followup timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [matchId]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleReview = async (followupId) => {
    try {
      await api.reviewAdoptionFollowup(followupId, matchId);
      setToastMessage('ยืนยันผลการตรวจสอบเรียบร้อยแล้ว');
      fetchData();
    } catch (err) {
      console.error('Error reviewing followup:', err);
      alert('เกิดข้อผิดพลาดในการตรวจสอบ');
    }
  };

  const handleSendReminder = async (milestoneLabel) => {
    try {
      setSendingReminder(milestoneLabel);
      await api.sendFollowupReminder(matchId, milestoneLabel);
      setToastMessage('ส่งข้อความแจ้งเตือนผู้รับเลี้ยงผ่านห้องแชทแล้ว');
    } catch (err) {
      console.error('Error sending reminder:', err);
      alert('เกิดข้อผิดพลาดในการส่งแจ้งเตือน');
    } finally {
      setSendingReminder(null);
    }
  };

  const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <AdoptionTimelineSkeleton />;
  }

  const petImage = animal?.images?.[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600';
  const petName = animal?.name || 'น้องสัตว์เลี้ยง';
  const petSpecies = animal?.species === 'cat' ? 'แมว' : 'สุนัข';
  const petAge = animal?.age ? `${animal.age} ปี` : 'อายุ 2 ปี';
  const petGender = animal?.gender === 'female' ? 'เพศเมีย' : 'เพศผู้';

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#FAF8F5', fontFamily: 'Prompt, sans-serif', padding: '24px 16px 80px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>

        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#374151',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              aria-label="ย้อนกลับ"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
              ประวัติการติดตาม
            </h1>
          </div>

          {followupInfo?.allSubmitted ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid #BBF7D0'
              }}
            >
              <CheckCircle2 size={15} /> ครบทุกรอบแล้ว
            </span>
          ) : followupInfo?.isDueForSubmission ? (
            <Link
              to={`/adoption/followup/${matchId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#15803D',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
              }}
            >
              <Camera size={15} /> อัปเดตสถานะ
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                const nd = followupInfo?.nextDue;
                const days = nd?.daysRemaining || 0;
                const daysUntil = nd?.daysUntilOpen || Math.max(1, days - 7);
                setToastMessage(`ยังไม่ถึงรอบส่งอัปเดต (${nd?.milestoneLabel || 'รอบถัดไป'})\nระบบจะเปิดให้ส่งเมื่อถึงกำหนดในวันที่ ${formatThaiDate(nd?.dueDate)} (เปิดส่งล่วงหน้า 7 วัน หรืออีก ${daysUntil} วัน)`);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E5E7EB'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
              title="ยังไม่ถึงกำหนดส่งอัปเดต"
            >
              <Clock size={15} /> รอถึงกำหนดส่ง
            </button>
          )}
        </div>

        {/* Pet Profile Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <img
            src={petImage}
            alt={petName}
            style={{ width: '68px', height: '68px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
              {petName}
            </h2>
            <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#6B7280' }}>
              {petSpecies} | อายุ {petAge} | {petGender}
            </p>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              <CheckCircle2 size={12} /> อยู่กับเจ้าของแล้ว
            </span>
          </div>
        </div>

        {/* Timeline Container */}
        <div style={{ position: 'relative', paddingLeft: '28px' }}>
          
          {/* Vertical Connecting Line */}
          <div style={{
            position: 'absolute',
            left: '13px',
            top: '20px',
            bottom: '20px',
            width: '2px',
            backgroundColor: '#E5E7EB',
            zIndex: 0
          }} />

          {/* Milestones List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', zIndex: 1 }}>
            {followupInfo.milestones.map((m, idx) => {
              const submission = m.submission;
              const isSubmitted = m.isSubmitted;
              const isOverdue = m.isOverdue;

              return (
                <div key={m.milestoneIndex} style={{ position: 'relative' }}>

                  {/* Timeline Node Icon */}
                  <div style={{
                    position: 'absolute',
                    left: '-28px',
                    top: '2px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isSubmitted ? '#16A34A' : isOverdue ? '#DC2626' : '#9CA3AF',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 4px #FAF8F5'
                  }}>
                    {isSubmitted ? (
                      <Check size={16} strokeWidth={3} />
                    ) : isOverdue ? (
                      <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>!</span>
                    ) : (
                      <Clock size={14} />
                    )}
                  </div>

                  {/* Milestone Card */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: `1px solid ${isOverdue ? '#FECACA' : '#E5E7EB'}`,
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}>
                    
                    {/* Header of Milestone */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#111827' }}>
                          {m.milestoneLabel}
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Calendar size={12} /> {formatThaiDate(submission ? submission.submitted_at : m.dueDate)}
                        </span>
                      </div>

                      {/* Status Badges */}
                      {isSubmitted ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          <Check size={12} strokeWidth={3} />
                          {submission.is_reviewed ? 'ตรวจสอบแล้ว' : 'ส่งรายงานแล้ว'}
                        </span>
                      ) : isOverdue ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          เกินกำหนด {m.daysOverdue} วัน
                        </span>
                      ) : m.isOpenForSubmission ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          ถึงกำหนดส่งแล้ว
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#F3F4F6',
                          color: '#6B7280',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          รอถึงกำหนด
                        </span>
                      )}
                    </div>

                    {/* Case 1: Already Submitted */}
                    {isSubmitted && submission && (
                      <div>
                        {/* Photos Gallery */}
                        {submission.photos && submission.photos.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '6px 0 10px' }}>
                            {submission.photos.map((pUrl, pIdx) => (
                              <img
                                key={pIdx}
                                src={pUrl}
                                alt={`photo-${pIdx}`}
                                onClick={() => setSelectedPhoto(pUrl)}
                                style={{
                                  width: '84px',
                                  height: '84px',
                                  borderRadius: '10px',
                                  objectFit: 'cover',
                                  cursor: 'pointer',
                                  border: '1px solid #E5E7EB',
                                  flexShrink: 0
                                }}
                              />
                            ))}
                          </div>
                        )}

                        {/* Health Summary Line */}
                        <div style={{
                          backgroundColor: '#F9FAFB',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '0.8rem',
                          color: '#374151',
                          lineHeight: 1.5,
                          marginTop: '4px'
                        }}>
                          <strong>สถานะ:</strong> {submission.health_status || 'แข็งแรงดี'} / {submission.food_status || 'กินอาหารปกติ'} / {submission.behavior_status || 'ปรับตัวได้ดี'}
                          {submission.notes && (
                            <div style={{ marginTop: '4px', color: '#6B7280', fontStyle: 'italic' }}>
                              "{submission.notes}"
                            </div>
                          )}
                        </div>

                        {/* Foundation review button */}
                        {isFoundation && !submission.is_reviewed && (
                          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleReview(submission.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#15803D',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <Check size={14} /> ตรวจสอบความถูกต้อง
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Case 2: Overdue */}
                    {isOverdue && !isSubmitted && (
                      <div style={{ marginTop: '6px' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#B91C1C' }}>
                          ยังไม่ได้รับการอัปเดตสถานะ กรุณาแจ้งเตือนผู้รับเลี้ยง
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {isFoundation ? (
                            <button
                              type="button"
                              disabled={sendingReminder === m.milestoneLabel}
                              onClick={() => handleSendReminder(m.milestoneLabel)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {sendingReminder === m.milestoneLabel ? (
                                <Loader2 size={14} className="spin" />
                              ) : (
                                <Bell size={14} />
                              )}
                              แจ้งเตือนผู้รับเลี้ยง
                            </button>
                          ) : (
                            <Link
                              to={`/adoption/followup/${matchId}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#15803D',
                                color: '#FFFFFF',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                textDecoration: 'none'
                              }}
                            >
                              <Camera size={14} /> อัปเดตสถานะรอบนี้
                            </Link>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Case 3: Upcoming */}
                    {!isOverdue && !isSubmitted && (
                      <div style={{ marginTop: '8px' }}>
                        {m.isOpenForSubmission ? (
                          <div>
                            <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#15803D', fontWeight: 600 }}>
                              เปิดให้ส่งรายงานแล้ว (ถึงกำหนด {formatThaiDate(m.dueDate)})
                            </p>
                            {!isFoundation && (
                              <Link
                                to={`/adoption/followup/${matchId}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  backgroundColor: '#15803D',
                                  color: '#FFFFFF',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  textDecoration: 'none'
                                }}
                              >
                                <Camera size={14} /> อัปเดตสถานะรอบนี้
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>
                              กำหนดส่งอัปเดตรอบนี้อีก {m.daysRemaining} วัน
                            </p>
                            <span style={{ fontSize: '0.72rem', color: '#9CA3AF', backgroundColor: '#F9FAFB', padding: '2px 8px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                              เปิดส่งล่วงหน้า 7 วัน
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Photo Modal */}
        {selectedPhoto && (
          <div
            onClick={() => setSelectedPhoto(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}
          >
            <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
              <img
                src={selectedPhoto}
                alt="Enlarged"
                style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }}
              />
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '-12px',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Toast Alert */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#111827',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            fontWeight: 500,
            zIndex: 9999
          }}>
            <Check size={16} color="#10B981" /> {toastMessage}
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', marginLeft: '6px' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
