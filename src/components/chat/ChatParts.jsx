// Pieces shared by both chat rooms (adopter: ChatRoom.jsx, foundation: FoundationChatRoom.jsx).
// Styles live in pages/FoundationChatRoom.css (fcr-*).
import React, { memo } from 'react';
import { AlertTriangle, Check, CheckCircle2, FileText, Heart, XCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import '../../pages/FoundationChatRoom.css';

export const renderMessageContent = (text, isMe, isApplication = false) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="fcr-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (/^[━─\-=_~]{3,}$/.test(trimmed)) {
          return <div key={idx} className={`fcr-text__rule ${isApplication ? 'is-app' : ''} ${isMe ? 'is-me' : ''}`} />;
        }
        const parts = line.split(/(https?:\/\/[^\s]+)/g);
        return (
          <div key={idx} className="fcr-text__line" style={{ minHeight: trimmed ? 'auto' : '0.6em' }}>
            {parts.map((part, pIdx) => (part.match(/^https?:\/\/[^\s]+$/)
              ? <a key={pIdx} href={part} target="_blank" rel="noopener noreferrer" className={isMe ? 'is-me' : ''}>{part}</a>
              : part))}
          </div>
        );
      })}
    </div>
  );
};

// Status notices the app posts into the chat (approved / declined / handed over)
export const OfficialNoticeCard = memo(function OfficialNoticeCard({ msg }) {
  const { t } = useI18n();
  const text = msg.text || '';
  const isApproved = text.includes('ได้รับการอนุมัติแล้ว') || text.includes('อนุมัติคำขอ');
  const isHandover = text.includes('การส่งมอบ') && (text.includes('เสร็จสมบูรณ์') || text.includes('สำเร็จ'));
  const isCancelled = text.includes('ยกเลิก');
  const isDeclined = !isApproved && !isHandover && (text.includes('ไม่สามารถอนุมัติ') || text.includes('ปฏิเสธ') || isCancelled || text.includes('ปิดคำขอ'));

  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !/^[━─\-=_~]{3,}$/.test(l) && !/^\[.*\]$/.test(l));

  let tone = 'ok';
  let Icon = CheckCircle2;
  let badge = t('fcr.notice.approved');
  let title = t('fcr.notice.resultTitle');
  if (isHandover) {
    tone = 'home'; Icon = Heart; badge = t('fcr.notice.handedOver'); title = t('fcr.notice.handoverTitle');
  } else if (isDeclined) {
    tone = 'no'; Icon = XCircle;
    badge = isCancelled ? t('fcr.notice.cancelled') : t('fcr.notice.declined');
    title = isCancelled ? t('fcr.notice.cancelTitle') : t('fcr.notice.resultTitle');
  }

  return (
    <div className="fcr-notice-row">
      <div className={`fcr-notice fcr-notice--${tone}`}>
        <div className="fcr-notice__head">
          <span className="fcr-notice__icon" aria-hidden="true"><Icon size={18} /></span>
          <span className="fcr-notice__title">{title}<small>{t('fcr.notice.auto')}</small></span>
          <span className="fcr-notice__badge">{badge}</span>
        </div>
        <div className="fcr-notice__body">
          {lines.map((line, idx) => {
            if (line.startsWith('เหตุผล:') || line.startsWith('รายละเอียดเพิ่มเติม:')) {
              return <p key={idx} className="fcr-notice__reason">{line}</p>;
            }
            return <p key={idx} className={line.includes('ยินดีด้วย') || line.includes('ขอบคุณ') ? 'is-lead' : ''}>{line}</p>;
          })}
        </div>
        <div className="fcr-notice__foot">{msg.timestamp}</div>
      </div>
    </div>
  );
});

export const MessageItem = memo(function MessageItem({ msg, isMe, otherPic, onPicError, onOpenApplication }) {
  const { t } = useI18n();
  if (msg.sender === 'system') {
    return <div className="fcr-system"><span>{msg.text}</span></div>;
  }

  const isOfficialNotice = msg.text && (
    msg.text.includes('[แจ้งผลการพิจารณาคำขอรับเลี้ยง]')
    || msg.text.includes('[แจ้งขอยกเลิกคำขอรับเลี้ยง]')
    || msg.text.includes('[แจ้งผลคำขอรับเลี้ยง]')
    || msg.text.includes('[ผู้ขอรับเลี้ยงแจ้งขอยกเลิกคำขอ]')
    || msg.text.includes('[ยืนยันการส่งมอบสัตว์เลี้ยงสำเร็จ]')
    || (msg.text.includes('คำขอรับเลี้ยง') && (msg.text.includes('ได้รับการอนุมัติแล้ว') || msg.text.includes('ไม่สามารถอนุมัติคำขอรับเลี้ยง')))
  );
  if (isOfficialNotice) return <OfficialNoticeCard msg={msg} />;

  const isApplication = msg.text && (msg.text.includes('ใบสมัครขอรับเลี้ยง') || msg.text.startsWith('📋'));

  return (
    <div className={`message-row msg-${isMe ? 'user' : 'shelter'} fcr-row`}>
      {!isMe && (
        <img src={otherPic} alt="" className="message-avatar" onError={onPicError} />
      )}
      <div className={`message-wrapper msg-${isMe ? 'user' : 'shelter'}`}>
        {isApplication ? (
          <div className="fcr-app">
            <div className="fcr-app__head">
              <span className="fcr-app__icon" aria-hidden="true"><FileText size={18} /></span>
              <span className="fcr-app__title">{t('fcr.app.title')}</span>
              {onOpenApplication && <button type="button" className="fcr-link" onClick={onOpenApplication}>{t('fcr.app.open')}</button>}
            </div>
            <div className="fcr-app__body">{renderMessageContent(msg.text, isMe, true)}</div>
          </div>
        ) : (
          <div className="message-bubble">
            {msg.imageUrl && <img src={msg.imageUrl} alt="" className="fcr-bubble-img" />}
            {msg.text && msg.text.trim() && renderMessageContent(msg.text, isMe, false)}
          </div>
        )}
        <div className={`fcr-meta ${isMe ? 'is-me' : ''}`}>
          <span className="message-timestamp">{msg.timestamp}</span>
          {isMe && <Check size={12} aria-hidden="true" />}
        </div>
      </div>
    </div>
  );
});

// Readiness answers, with the ones worth a conversation flagged
export function Answers({ rows }) {
  const { t } = useI18n();
  return (
    <ul className="fcr-answers">
      {rows.map((r) => (
        <li key={r.id} className={`fcr-answer ${r.concern ? 'is-concern' : ''} ${r.answer ? '' : 'is-missing'}`}>
          <span className="fcr-answer__label">{r.label}</span>
          <span className="fcr-answer__value">
            {r.answer || t('fcr.notAnswered')}
            {r.concern && r.answer && <span className="fcr-answer__flag"><AlertTriangle size={12} aria-hidden="true" /> {t('fcr.talkAbout')}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// "วันนี้" / "เมื่อวาน" / date, inserted where the day changes
export function dayLabel(iso, t, lang) {
  const d = iso ? new Date(iso) : new Date();
  const days = Math.floor((new Date(new Date().toDateString()) - new Date(d.toDateString())) / 86400000);
  if (days <= 0) return t('fcr.today');
  if (days === 1) return t('fmc.yesterday');
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined });
}

