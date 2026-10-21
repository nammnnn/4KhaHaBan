// Building blocks for the profile hub — DESIGN.md §7.16
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, PawPrint } from 'lucide-react';
import { api } from '../../services/api';
import { splitAnimalName } from '../SwipeCard';
import './ProfileSections.css';

export function ProfileSection({ title, action, children }) {
  return (
    <section className="pf-section">
      <div className="pf-section__head">
        <h2 className="pf-section__title">{title}</h2>
        {action}
      </div>
      <div className="pf-section__body">{children}</div>
    </section>
  );
}

// A tappable (to/onClick) or static row: label on the left, value on the right.
export function InfoRow({ label, value, icon: Icon, to, onClick, tone }) {
  const content = (
    <>
      {Icon && <Icon size={20} className="pf-row__icon" aria-hidden="true" />}
      <span className="pf-row__label">{label}</span>
      <span className={`pf-row__value${tone ? ` pf-row__value--${tone}` : ''}`}>{value}</span>
      {(to || onClick) && <ChevronRight size={18} className="pf-row__chev" aria-hidden="true" />}
    </>
  );
  const cls = `pf-row${value ? '' : ' pf-row--menu'}`;
  if (to) return <Link to={to} className={`${cls} pf-row--link`}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} pf-row--link`}>{content}</button>;
  return <div className={cls}>{content}</div>;
}

const STATUS = {
  pending: { label: 'รอมูลนิธิตรวจสอบ', tone: 'pending' },
  approved: { label: 'อนุมัติแล้ว · คุยต่อในแชท', tone: 'success' },
  rejected: { label: 'ไม่ผ่านการพิจารณา', tone: 'danger' },
  adopted: { label: 'รับเลี้ยงแล้ว', tone: 'success' },
  completed: { label: 'รับเลี้ยงแล้ว', tone: 'success' },
};

function RequestThumb({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className="pf-req__thumb pf-req__thumb--empty"><PawPrint size={20} aria-hidden="true" /></span>;
  }
  return <img className="pf-req__thumb" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

// Latest adoption requests with their status (newest first, as returned by the API).
export function AdoptionRequests({ matches, limit = 3 }) {
  const shown = (matches || []).slice(0, limit);
  const [animals, setAnimals] = useState({});

  useEffect(() => {
    let cancelled = false;
    const ids = [...new Set(shown.map((m) => m.animalId).filter(Boolean))].filter((id) => !animals[id]);
    if (ids.length === 0) return undefined;
    Promise.all(ids.map((id) => api.getAnimalById(id).then((a) => [id, a]).catch(() => [id, null])))
      .then((pairs) => {
        if (!cancelled) setAnimals((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.map((m) => m.animalId).join(',')]);

  if (shown.length === 0) {
    return (
      <div className="pf-empty">
        <p>ยังไม่มีคำขอรับเลี้ยง</p>
        <Link to="/" className="ui-btn ui-btn--secondary ui-btn--sm">ไปดูน้องๆ</Link>
      </div>
    );
  }

  return (
    <ul className="pf-req-list">
      {shown.map((m) => {
        const animal = animals[m.animalId];
        const status = STATUS[m.status] || { label: 'กำลังดำเนินการ', tone: 'neutral' };
        const name = animal ? splitAnimalName(animal.name).main : 'กำลังโหลด…';
        return (
          <li key={m.id}>
            <Link to={`/chat/${m.id}`} className="pf-req">
              <RequestThumb src={animal?.images?.[0]} />
              <span className="pf-req__text">
                <span className="pf-req__name">{name}</span>
                <span className={`pf-req__status pf-req__status--${status.tone}`}>
                  <span className="pf-req__dot" aria-hidden="true" />
                  {status.label}
                </span>
              </span>
              <ChevronRight size={18} className="pf-row__chev" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Draft FAQ — answers follow how the app works today; review wording with the foundation.
const FAQ = [
  {
    q: 'ขั้นตอนการรับเลี้ยงเป็นอย่างไร?',
    a: [
      'ปัดขวาหรือกด "ส่งคำขอรับเลี้ยง" ที่น้องที่สนใจ',
      'มูลนิธิตรวจสอบข้อมูลและแบบประเมินของคุณ',
      'ถ้าอนุมัติ คุยรายละเอียดและนัดพบน้องผ่านแชท',
      'รับน้องกลับบ้าน มูลนิธิอาจขอติดตามความเป็นอยู่ของน้องหลังรับเลี้ยง',
    ],
  },
  {
    q: 'ทำไมต้องยืนยันตัวตน?',
    a: 'เพื่อให้มูลนิธิมั่นใจว่าน้องจะได้บ้านที่ปลอดภัย มูลนิธิใช้ข้อมูลและแบบประเมินของคุณในการพิจารณาคำขอรับเลี้ยง',
  },
  {
    q: 'ส่งคำขอแล้วต้องรอนานไหม?',
    a: 'ขึ้นอยู่กับมูลนิธิแต่ละแห่ง ติดตามสถานะได้ที่ "คำขอรับเลี้ยงของฉัน" ด้านบน หรือในเมนูแชท เมื่อมีความคืบหน้าจะมีตัวเลขแจ้งเตือนที่เมนูแชท',
  },
  {
    q: 'ยกเลิกคำขอรับเลี้ยงได้ไหม?',
    a: 'ได้ เปิดห้องแชทของคำขอนั้น แตะเมนู ⋯ มุมขวาบน แล้วเลือก "ขอยกเลิกคำขอรับเลี้ยง"',
  },
];

export function FaqList() {
  const [open, setOpen] = useState(null);
  return (
    <div className="pf-faq">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className={`pf-faq__item${isOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="pf-faq__q"
              aria-expanded={isOpen}
              aria-controls={`faq-a-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{item.q}</span>
              <ChevronDown size={18} aria-hidden="true" />
            </button>
            {isOpen && (Array.isArray(item.a) ? (
              <ol id={`faq-a-${i}`} className="pf-faq__a pf-faq__steps">
                {item.a.map((step) => <li key={step}>{step}</li>)}
              </ol>
            ) : (
              <p id={`faq-a-${i}`} className="pf-faq__a">{item.a}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
