import React from 'react';
import { PawWalk } from './motion/PawMotion';
import BrandMark from './BrandMark';
import { useI18n } from '../i18n';
import '../pages/Login.css';
import '../pages/AnimalProfileBento.css';
import '../pages/ServicePages.css';
import '../pages/FoundationDashboard.css';
import '../pages/FoundationAnimals.css';
import '../pages/FoundationIncidents.css';
import '../pages/AnimalForm.css';
import '../pages/FoundationChatRoom.css';

/**
 * 4 ขาหาบ้าน — Skeleton Loading Components
 * Shimmer placeholders that strictly match current UI designs and layouts.
 */

// 1. Swipe Card Deck Skeleton (Feed) — same layout as SwipeCard (DESIGN.md §7.12)
export const FeedCardSkeleton = () => (
  <div className="swipe-card feed-skel" aria-hidden="true">
    <div className="feed-skel__photo">
      {/* Little paws walking across while the deck loads (DESIGN.md §6.1) */}
      <PawWalk steps={4} size={26} />
    </div>
    <div className="feed-skel__info">
      <span className="feed-skel__bar feed-skel__bar--name" />
      <span className="feed-skel__bar" style={{ width: '24%' }} />
      <span className="feed-skel__bar" style={{ width: '46%', marginTop: '6px' }} />
      <span className="feed-skel__bar" style={{ width: '62%' }} />
      <div className="feed-skel__chips">
        {[72, 96, 64].map((w) => (
          <span key={w} className="feed-skel__bar feed-skel__bar--chip" style={{ width: `${w}px` }} />
        ))}
      </div>
    </div>
  </div>
);

// Wide-screen detail panel beside the feed deck — same elements as FeedDetailPanel with the text hidden
export const FeedPanelSkeleton = () => {
  const sk = (text) => <span className="skeleton sp-sk-text">{text}</span>;
  return (
    <div className="feed-panel__inner" aria-hidden="true">
      <header className="feed-panel__head">
        <div><h2 className="feed-panel__name">{sk('ชื่อน้อง')}</h2></div>
        <span className="feed-panel__more">{sk('ดูประวัติเต็ม')}</span>
      </header>
      <dl className="ap-facts feed-panel__facts">
        {['ประเภท', 'เพศ', 'อายุ', 'ขนาด'].map((label) => (
          <div key={label} className="ap-fact"><dt>{sk(label)}</dt><dd>{sk('ไม่ระบุ')}</dd></div>
        ))}
      </dl>
      <section className="feed-panel__section">
        <div className="ap-section__head"><h3 className="feed-panel__title">{sk('เรื่องราว')}</h3></div>
        <p className="feed-panel__story">{sk('น้องเป็นแมวอารมณ์ดี ขี้อ้อน ชอบให้เกาคาง อยู่กับคนได้ง่าย กินง่ายอยู่ง่าย เหมาะกับครอบครัวที่อยากได้เพื่อนตัวเล็ก ๆ')}</p>
      </section>
      <section className="feed-panel__section">
        <h3 className="feed-panel__title">{sk('ผู้ดูแล')}</h3>
        <p className="feed-panel__shelter">{sk('มูลนิธิช่วยเหลือสัตว์')}</p>
      </section>
    </div>
  );
};

// 1.1 Full Feed Page Skeleton (Feed Page Suspense Fallback)
export const FeedPageSkeleton = () => (
  <div className="feed-container">
    <div className="feed-header">
      <h1 className="logo-text">
        4 ขา<span className="logo-text__accent">หาบ้าน</span>
      </h1>
      <div className="feed-header__actions">
        <div className="skeleton skeleton-circle" style={{ width: '44px', height: '44px' }} />
        <div className="skeleton" style={{ width: '104px', height: '44px', borderRadius: 'var(--radius-full)' }} />
      </div>
    </div>

    <div className="card-stack-container">
      <FeedCardSkeleton />
    </div>

    <div className="swiper-actions" aria-hidden="true">
      <div className="skeleton skeleton-circle" style={{ width: '64px', height: '64px' }} />
      <div className="skeleton skeleton-circle" style={{ width: '48px', height: '48px' }} />
      <div className="skeleton skeleton-circle" style={{ width: '64px', height: '64px' }} />
    </div>

    <aside className="feed-panel" aria-hidden="true"><FeedPanelSkeleton /></aside>
  </div>
);

// 2. Chat List & Split View Skeleton (MatchChat, FoundationMatchChat) - Responsive Desktop & Mobile
export const ChatListSkeleton = () => {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isChatRoomRoute = path.includes('/chat/');
  // Adopter chat list has no tabs or count pill (DESIGN.md §7.21); the foundation list still does
  const simple = !path.startsWith('/foundation');

  return (
    <div className="page-container match-page matches-split-view">
      {/* Left Panel: Matches List (hidden on mobile when chat room is active) */}
      <div className={`matches-list-panel ${isChatRoomRoute ? 'hidden-on-mobile' : ''}`}>
        {/* Header */}
        {simple ? (
          <div style={{ padding: '24px 20px 12px' }}>
            <div className="skeleton skeleton-text" style={{ width: '72px', height: '28px' }} />
            <div className="skeleton skeleton-text" style={{ width: '96px', height: '14px', marginTop: '20px' }} />
          </div>
        ) : (
        <div className="list-header" style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="skeleton skeleton-text" style={{ width: '100px', height: '24px' }} />
            <div className="skeleton" style={{ width: '60px', height: '22px', borderRadius: '12px' }} />
          </div>

          {/* 3 Tabs */}
          <div className="chat-tabs" style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', marginTop: '16px', gap: '8px', paddingBottom: '12px' }}>
            <div className="skeleton" style={{ flex: 1, height: '26px', borderRadius: '6px' }} />
            <div className="skeleton" style={{ flex: 1, height: '26px', borderRadius: '6px' }} />
            <div className="skeleton" style={{ flex: 1, height: '26px', borderRadius: '6px' }} />
          </div>

          {/* Search Bar */}
          <div className="chat-search-bar" style={{ padding: '14px 0' }}>
            <div className="skeleton" style={{ width: '100%', height: '40px', borderRadius: '10px' }} />
          </div>
        </div>

        )}

        {/* Matches List */}
        <div className="matches-list" style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'hidden' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={simple ? undefined : 'match-item'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: simple ? '12px 8px' : '12px 14px',
                borderRadius: '16px',
                border: simple ? 'none' : '1px solid #F3F4F6',
                backgroundColor: simple ? 'transparent' : '#FFFFFF'
              }}
            >
              <div className="skeleton skeleton-circle" style={{ width: simple ? '52px' : '48px', height: simple ? '52px' : '48px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton skeleton-text" style={{ width: `${80 + (i % 3) * 25}px`, height: '16px' }} />
                  <div className="skeleton skeleton-text" style={{ width: '48px', height: '12px' }} />
                </div>
                <div className="skeleton skeleton-text" style={{ width: `${130 + (i % 2) * 40}px`, height: '13px' }} />
                <div className="skeleton" style={{ width: '80px', height: '18px', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Chat Room or Empty State */}
      <div className={`matches-chat-panel ${!isChatRoomRoute ? 'hidden-on-mobile hidden-on-desktop' : ''}`}>
        {isChatRoomRoute ? (
          <ChatRoomSkeleton />
        ) : (
          <div className="empty-chat-state">
            <div style={{ padding: '24px', backgroundColor: '#F3F4F6', borderRadius: '50%', marginBottom: '16px' }}>
              <div className="skeleton skeleton-circle" style={{ width: '48px', height: '48px' }} />
            </div>
            <div className="skeleton skeleton-text" style={{ width: '220px', height: '22px' }} />
          </div>
        )}
      </div>
    </div>
  );
};

// 3. Chat Room Skeleton (ChatRoom, FoundationChatRoom, SupportChat) - Clean Minimalist Loader (No fake bubbles)
export const ChatRoomSkeleton = () => (
  // chat-room-container: phones hide the bottom dock for chat rooms, so the skeleton must too
  <div className="chat-room-container fcr" aria-busy="true" aria-label="กำลังโหลด">
    <div className="fcr-head">
      <span className="fd-sk" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="fd-sk" style={{ width: 140, height: 16 }} />
        <span className="fd-sk" style={{ width: 90, height: 12 }} />
      </span>
      <span className="fd-sk" style={{ width: 44, height: 44, borderRadius: 12 }} />
    </div>
    <div className="fcr-messages">
      {[['left', 62], ['left', 48], ['right', 55], ['left', 40]].map(([side, w], i) => (
        <span key={i} className="fd-sk" style={{ alignSelf: side === 'left' ? 'flex-start' : 'flex-end', width: `${w}%`, height: 44, borderRadius: 18 }} />
      ))}
    </div>
    <div className="fcr-compose">
      <span className="fd-sk" style={{ display: 'block', height: 44, borderRadius: 999 }} />
    </div>
  </div>
);


// 4. Foundation Dashboard Skeleton (Redesigned matching current UI)
export const FoundationDashboardSkeleton = () => (
  <div className="fd-page" aria-busy="true" aria-label="กำลังโหลด">
    <header className="fd-header">
      <div className="fd-header__text">
        <span className="fd-sk" style={{ width: 240, height: 30 }} />
        <span className="fd-sk" style={{ width: 120, height: 24, borderRadius: 999 }} />
      </div>
      <span className="fd-sk fd-header__cta" style={{ height: 48, minWidth: 170 }} />
    </header>
    <section className="fd-card fd-todo">
      <span className="fd-sk" style={{ width: 110, height: 22 }} />
      <div className="fd-todo__list">
        <span className="fd-sk" style={{ height: 64 }} />
        <span className="fd-sk" style={{ height: 64 }} />
      </div>
    </section>
    <section className="fd-stats">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="fd-stat">
          <span className="fd-sk fd-stat__label" style={{ width: 80, height: 16 }} />
          <span className="fd-sk fd-stat__icon" />
          <span className="fd-sk fd-stat__value" style={{ width: 70, height: 28 }} />
        </div>
      ))}
    </section>
    <div className="fd-grid">
      {[0, 1].map((i) => (
        <section key={i} className="fd-card">
          <span className="fd-sk" style={{ width: 120, height: 22 }} />
          <span className="fd-sk" style={{ height: 40 }} />
          <span className="fd-sk" style={{ height: 40 }} />
        </section>
      ))}
    </div>
  </div>
);

// 5. Animals List Skeleton (FoundationAnimals)
// Same rule as FoundationAnimals: the saved choice, else cards on wide screens and a list on phones
function animalsView() {
  let saved = null;
  try { saved = localStorage.getItem('4kh_fa_view'); } catch { /* blocked */ }
  if (saved === 'grid' || saved === 'list') return saved;
  return typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px)').matches ? 'grid' : 'list';
}

export const FoundationAnimalsSkeleton = () => {
  const view = animalsView();
  return (
    <div className="fa-page" aria-busy="true" aria-label="กำลังโหลด">
      <header className="fa-header">
        <div>
          <span className="fd-sk" style={{ display: 'block', width: 150, height: 28 }} />
          <span className="fd-sk" style={{ display: 'block', width: 190, height: 16, marginTop: 6 }} />
        </div>
        <span className="fd-sk fa-header__cta" style={{ height: 48, minWidth: 170 }} />
      </header>
      <div className="fa-toolbar">
        <div className="fa-toolbar__row">
          <span className="fd-sk fa-search" style={{ height: 44 }} />
          <span className="fd-sk fa-tool" style={{ border: 0 }} />
          <span className="fd-sk fa-tool" style={{ border: 0 }} />
          <span className="fd-sk" style={{ width: 84, height: 44, borderRadius: 12, flexShrink: 0 }} />
        </div>
        <span className="fd-sk" style={{ height: 40, width: 360, maxWidth: '100%', borderRadius: 999 }} />
      </div>
      <ul className={`fa-grid fa-grid--${view}`}>
        {[0, 1, 2, 3, 4, 5].slice(0, view === 'grid' ? 6 : 4).map((i) => (
          <li key={i} className="fa-card">
            <span className="fa-card__media"><span className="fd-sk fa-card__photo" style={{ borderRadius: view === 'grid' ? 0 : undefined }} /></span>
            <div className="fa-card__body">
              <span className="fd-sk" style={{ width: '50%', height: 22, marginTop: 4 }} />
              <span className="fd-sk" style={{ width: '70%', height: 16, marginTop: 6 }} />
              <span className="fd-sk" style={{ width: 130, height: 36, marginTop: 'auto', borderRadius: 999 }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Add / edit animal: header and the four numbered sections, with the sticky save bar
export const AnimalFormSkeleton = () => (
  <div className="af-page" aria-busy="true" aria-label="กำลังโหลด">
    <header className="af-header">
      <span className="fd-sk" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span className="fd-sk" style={{ display: 'block', width: 180, height: 26 }} />
        <span className="fd-sk" style={{ display: 'block', width: '80%', maxWidth: 360, height: 14, marginTop: 8 }} />
      </div>
    </header>
    <div className="af-form">
      {[150, 300, 220, 260].map((h, i) => (
        <section key={i} className="af-section" style={{ minHeight: h }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="fd-sk" style={{ width: 28, height: 28, borderRadius: '50%' }} />
            <span className="fd-sk" style={{ width: 120, height: 20 }} />
          </span>
          <span className="fd-sk" style={{ height: 14, width: '70%' }} />
          <span className="fd-sk" style={{ flex: 1, minHeight: 48 }} />
        </section>
      ))}
      <div className="af-savebar"><span className="fd-sk af-savebar__btn" style={{ minHeight: 52, borderRadius: 12 }} /></div>
    </div>
  </div>
);

// 6. Incidents List Skeleton (FoundationIncidents)
export const FoundationIncidentsSkeleton = () => (
  <div className="inc-page" aria-busy="true" aria-label="กำลังโหลด">
    <header className="inc-header">
      <span className="fd-sk" style={{ display: 'block', width: 110, height: 28 }} />
      <span className="fd-sk" style={{ display: 'block', width: 200, height: 16, marginTop: 6 }} />
    </header>
    <div className="inc-filters">
      {[150, 100, 100, 80].map((w, i) => <span key={i} className="fd-sk" style={{ flexShrink: 0, width: w, height: 40, borderRadius: 999 }} />)}
    </div>
    <ul className="inc-list">
      {[0, 1].map((i) => (
        <li key={i} className="inc-card">
          <span className="fd-sk inc-photo" style={{ borderRadius: 0 }} />
          <div className="inc-card__body">
            <span className="fd-sk" style={{ width: 180, height: 22, borderRadius: 999 }} />
            <span className="fd-sk" style={{ width: '80%', height: 24 }} />
            <span className="fd-sk" style={{ width: '60%', height: 18 }} />
            <span className="fd-sk" style={{ width: 200, height: 48, marginTop: 8 }} />
          </div>
        </li>
      ))}
    </ul>
  </div>
);

// 7. Adoption Timeline Skeleton (AdoptionTimeline)
export const AdoptionTimelineSkeleton = () => (
  <div style={{ minHeight: '100dvh', backgroundColor: '#FAF8F5', padding: '24px 16px 80px', boxSizing: 'border-box' }}>
    <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="skeleton" style={{ width: '38px', height: '38px', borderRadius: '8px' }} />
          <div className="skeleton skeleton-text" style={{ width: '150px', height: '22px' }} />
        </div>
        <div className="skeleton" style={{ width: '110px', height: '36px', borderRadius: '10px' }} />
      </div>

      {/* Pet Summary Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '14px 16px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <div className="skeleton" style={{ width: '56px', height: '56px', borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '100px', height: '18px', marginBottom: '6px' }} />
          <div className="skeleton skeleton-text" style={{ width: '140px', height: '13px' }} />
        </div>
        <div className="skeleton" style={{ width: '75px', height: '24px', borderRadius: '12px' }} />
      </div>

      {/* Milestones Vertical Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div className="skeleton skeleton-circle" style={{ width: '28px', height: '28px', flexShrink: 0 }} />
            <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton skeleton-text" style={{ width: '100px', height: '16px' }} />
                <div className="skeleton" style={{ width: '70px', height: '20px', borderRadius: '6px' }} />
              </div>
              <div className="skeleton skeleton-text" style={{ width: '70%', height: '13px' }} />
              <div className="skeleton" style={{ width: '100%', height: '70px', borderRadius: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 8. Adoption Followup Form Skeleton (AdoptionFollowup)
export const AdoptionFollowupSkeleton = () => (
  <div style={{ minHeight: '100dvh', backgroundColor: 'var(--background)', padding: '24px 16px 80px', boxSizing: 'border-box' }} aria-busy="true" aria-label="กำลังโหลด">
    <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="fd-sk" style={{ width: 38, height: 38, borderRadius: 8 }} />
        <span className="fd-sk" style={{ width: 200, height: 22 }} />
        <span className="fd-sk" style={{ width: 80, height: 34, borderRadius: 8, marginLeft: 'auto' }} />
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '14px 16px', boxShadow: 'var(--elev-raised)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="fd-sk" style={{ width: 68, height: 68, borderRadius: 12, flexShrink: 0 }} />
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="fd-sk" style={{ width: 110, height: 18 }} />
          <span className="fd-sk" style={{ width: 160, height: 13 }} />
          <span className="fd-sk" style={{ width: 100, height: 20, borderRadius: 999 }} />
        </span>
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, boxShadow: 'var(--elev-raised)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <span className="fd-sk" style={{ width: 64, height: 64, borderRadius: '50%' }} />
        <span className="fd-sk" style={{ width: '60%', height: 22 }} />
        <span className="fd-sk" style={{ width: '100%', height: 110, borderRadius: 12 }} />
        <span className="fd-sk" style={{ width: '90%', height: 14 }} />
        <span className="fd-sk" style={{ width: '100%', height: 44, borderRadius: 10 }} />
      </div>
    </div>
  </div>
);

// 9. Foundation Needs Skeleton (FoundationNeeds)
export const FoundationNeedsSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
    {[1, 2, 3, 4].map(i => (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 18px',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
          <div className="skeleton" style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="skeleton skeleton-text" style={{ width: `${120 + (i % 3) * 30}px`, height: '18px' }} />
              <div className="skeleton" style={{ width: '55px', height: '20px', borderRadius: '6px' }} />
            </div>
            <div className="skeleton skeleton-text" style={{ width: '180px', height: '13px' }} />
          </div>
        </div>
        <div className="skeleton" style={{ width: '48px', height: '28px', borderRadius: '14px', flexShrink: 0 }} />
      </div>
    ))}
  </div>
);

export const FoundationNeedsPageSkeleton = () => (
  <div style={{ minHeight: '100dvh', backgroundColor: 'var(--background)', padding: '32px 16px 100px', boxSizing: 'border-box' }} aria-busy="true" aria-label="กำลังโหลด">
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="fd-sk" style={{ width: 38, height: 38, borderRadius: 8 }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="fd-sk" style={{ width: 200, height: 24 }} />
            <span className="fd-sk" style={{ width: 'min(420px, 60vw)', height: 14 }} />
          </span>
        </div>
        <span className="fd-sk" style={{ width: 170, height: 40, borderRadius: 8 }} />
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line-200)', padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 14 }}>
        <span className="fd-sk" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="fd-sk" style={{ width: '60%', height: 16 }} />
          <span className="fd-sk" style={{ width: '45%', height: 13 }} />
          <span className="fd-sk" style={{ width: '40%', height: 13 }} />
          <span className="fd-sk" style={{ width: '70%', height: 13 }} />
        </span>
      </div>
      <span className="fd-sk" style={{ display: 'block', width: 220, height: 14, marginBottom: 10 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {[120, 150, 140, 170, 190, 130].map((w, i) => <span key={i} className="fd-sk" style={{ width: w, height: 32, borderRadius: 999 }} />)}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflow: 'hidden' }}>
        {[80, 100, 120, 130, 110, 70].map((w, i) => <span key={i} className="fd-sk" style={{ width: w, height: 34, borderRadius: 8, flexShrink: 0 }} />)}
      </div>
      <FoundationNeedsSkeleton />
    </div>
  </div>
);

// 10. Animal Profile Skeleton (AnimalProfile)
// Mirrors AnimalProfile: photo (+ adopt button on desktop) | name, facts, story, tags, caretaker
export const AnimalProfileSkeleton = () => {
  const bar = (w, h = 14, extra = {}) => (
    <div className="skeleton" style={{ width: w, height: `${h}px`, borderRadius: 'var(--radius-full)', ...extra }} />
  );
  const heading = (w) => bar(w, 20, { borderRadius: 'var(--radius-sm)' });
  return (
    <div className="ap-layout" aria-hidden="true">
      <div className="ap-media">
        <div className="ap-hero"><div className="skeleton ap-photo-skeleton" /></div>
        <div className="ap-cta-inline">
          <div className="skeleton" style={{ height: '48px', borderRadius: 'var(--radius-md)' }} />
          {bar('70%', 12, { margin: '0 auto' })}
        </div>
      </div>
      <div className="ap-sheet">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {bar('40%', 36, { borderRadius: 'var(--radius-sm)' })}
          {bar('18%')}
        </div>
        <div className="skeleton" style={{ height: '76px', borderRadius: 'var(--radius-lg)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {heading('38%')}
            {bar('120px', 40)}
          </div>
          {bar('100%')}
          {bar('92%')}
          {bar('55%')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {heading('30%')}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[120, 72, 96].map((w) => <div key={w}>{bar(`${w}px`, 32)}</div>)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {heading('24%')}
          <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    </div>
  );
};

// 11. Form Page Skeleton (AnimalForm, UserVerification)
export const FormPageSkeleton = () => (
  <div style={{ minHeight: '100dvh', backgroundColor: '#FAF8F5', padding: '32px 16px 100px', boxSizing: 'border-box' }}>
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div className="skeleton" style={{ width: '38px', height: '38px', borderRadius: '8px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="skeleton skeleton-text" style={{ width: '160px', height: '22px' }} />
          <div className="skeleton skeleton-text" style={{ width: '240px', height: '14px' }} />
        </div>
      </div>
      {/* Form Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '130px', borderRadius: '16px' }} />
        <div className="skeleton" style={{ height: '64px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '64px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '110px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '48px', borderRadius: '12px' }} />
      </div>
    </div>
  </div>
);

// 12. Foundation Pending Status Skeleton (FoundationPending)
export const FoundationPendingSkeleton = () => (
  <div style={{ minHeight: '100dvh', backgroundColor: '#FAF8F5', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
    <div className="skeleton-card" style={{ maxWidth: '520px', width: '100%', textAlign: 'center', padding: '40px 24px' }}>
      <div className="skeleton skeleton-circle" style={{ width: '64px', height: '64px', margin: '0 auto 20px' }} />
      <div className="skeleton skeleton-text" style={{ width: '50%', height: '24px', margin: '0 auto 12px' }} />
      <div className="skeleton skeleton-text" style={{ width: '80%', height: '14px', margin: '0 auto 24px' }} />
      <div className="skeleton" style={{ height: '80px', borderRadius: '12px', marginBottom: '20px' }} />
      <div className="skeleton" style={{ height: '44px', borderRadius: '10px' }} />
    </div>
  </div>
);

// 13. Donation Page Skeleton (Donation)
// Same elements as NeedsList with hidden placeholder text, so it is exactly the same size
export function NeedsSkeleton() {
  const bar = (text) => <span className="skeleton sp-sk-text">{text}</span>;
  return (
    <>
      <ul className="sp-needs" aria-hidden="true">
        {['อาหารเม็ดสำหรับสุนัข', 'อาหารเปียกและนมลูกแมวอ่อน', 'แผ่นรองซับขนาดใหญ่'].map((name) => (
          <li key={name}>
            <span>
              <strong>{bar(name)}</strong>
              <small>{bar('รายละเอียดสั้น ๆ ของสิ่งที่ต้องการ')}</small>
            </span>
            <span className="ui-badge skeleton sp-sk-text">ต้องการด่วน</span>
          </li>
        ))}
      </ul>
      <span className="sp-more" aria-hidden="true">{bar('ดูทั้งหมด (0)')}</span>
    </>
  );
}


// Mirrors pages/Donation.jsx (DESIGN.md §7.23)
export const DonationSkeleton = () => (
  <div className="sp-page sp-page--wide" aria-hidden="true">
    {/* Header and picker use the real elements with hidden text, so nothing below shifts */}
    <div className="sp-head">
      <h1 className="sp-head__title"><span className="skeleton sp-sk-text">บริจาค</span></h1>
      <p className="sp-head__sub"><span className="skeleton sp-sk-text">ช่วยค่าอาหาร ยา และการรักษาน้องในมูลนิธิ ด้วยเงินหรือสิ่งของ</span></p>
    </div>
    <div className="sp-card sp-picked">
      <span className="sp-avatar skeleton" />
      <span className="sp-picked__body">
        <small><span className="skeleton sp-sk-text">บริจาคให้</span></small>
        <strong><span className="skeleton sp-sk-text">มูลนิธิช่วยเหลือสัตว์</span></strong>
        <span className="sp-picked__meta"><span className="skeleton sp-sk-text">ขอนแก่น</span></span>
      </span>
    </div>
    <div className="sp-two">
      {/* Money: same blocks as the real card */}
      <div className="sp-card">
        <div className="skeleton skeleton-text" style={{ width: '140px', height: '22px' }} />
        <div className="skeleton skeleton-text" style={{ width: '85%', height: '14px' }} />
        <div className="skeleton skeleton-text" style={{ width: '70px', height: '14px' }} />
        <div className="sp-tiers">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: '76px', borderRadius: '12px' }} />)}
          <div className="skeleton" style={{ gridColumn: '1 / -1', height: '52px', borderRadius: '12px' }} />
        </div>
        <div className="skeleton" style={{ height: '46px', borderRadius: '12px' }} />
        <div className="sp-card__foot">
          <div className="skeleton skeleton-text" style={{ width: '80%', height: '14px' }} />
          <div className="skeleton" style={{ height: '48px', borderRadius: '12px' }} />
        </div>
      </div>
      {/* Supplies: real elements with hidden text, so it is the same height as the loaded card */}
      <div className="sp-card sp-hide-mobile">
        <div className="sp-card__head">
          <h2 className="sp-card__title"><span className="skeleton sp-sk-text">ส่งของ</span></h2>
          <span className="sp-tip__btn skeleton sp-sk-text">วิธีส่ง</span>
        </div>
        <p className="sp-card__hint"><span className="skeleton sp-sk-text">สั่งออนไลน์หรือส่งพัสดุถึงมูลนิธิได้โดยตรง</span></p>
        <h3 className="sp-label"><span className="skeleton sp-sk-text">ของที่ต้องการตอนนี้</span></h3>
        <div className="sp-needs-area"><NeedsSkeleton /></div>
        <div className="sp-address">
          <div className="sp-address__head">
            <h3 className="sp-label"><span className="skeleton sp-sk-text">ที่อยู่จัดส่ง</span></h3>
            <span className="ui-btn ui-btn--ghost ui-btn--sm" style={{ visibility: 'hidden' }}>คัดลอก</span>
          </div>
          <address>
            <strong><span className="skeleton sp-sk-text">มูลนิธิช่วยเหลือสัตว์</span></strong>
            <span className="sp-address__text"><span className="skeleton sp-sk-text">123 หมู่ 4 ถ.มิตรภาพ ต.ในเมือง อ.เมืองขอนแก่น</span></span>
            <span className="sp-address__tel"><span className="skeleton sp-sk-text">โทร. 000-000-0000</span></span>
          </address>
        </div>
      </div>
    </div>
  </div>
);

// Mirrors pages/IncidentReport.jsx (DESIGN.md §7.22)
export const IncidentReportSkeleton = () => (
  <div className="sp-page sp-page--wide" aria-hidden="true">
    <div className="sp-head">
      <div className="skeleton skeleton-text" style={{ width: '75%', maxWidth: '420px', height: '32px' }} />
      <div className="skeleton skeleton-text" style={{ width: '90%', maxWidth: '520px', height: '16px', marginTop: '10px' }} />
      <div className="skeleton skeleton-text" style={{ width: '180px', height: '14px', marginTop: '14px' }} />
    </div>
    <div className="skeleton" style={{ height: '48px', maxWidth: '400px', borderRadius: '12px' }} />
    <div className="sp-form">
      <div className="sp-card sp-card--tight">
        <div className="skeleton skeleton-text" style={{ width: '120px', height: '20px' }} />
        <div className="sp-chips">{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '12px' }} />)}</div>
        <div className="sp-chips">{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '12px' }} />)}</div>
        <div className="skeleton" style={{ height: '96px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '70px', borderRadius: '12px' }} />
      </div>
      <div className="sp-card sp-card--tight sp-hide-mobile">
        <div className="skeleton skeleton-text" style={{ width: '100px', height: '20px' }} />
        <div className="skeleton" style={{ height: '48px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '48px', borderRadius: '12px' }} />
      </div>
    </div>
  </div>
);


// 14. User Profile Skeleton (UserProfile)
export const UserProfileSkeleton = () => (
  <div style={{ minHeight: '100dvh', backgroundColor: '#FAF8F5', padding: '28px 16px 100px', boxSizing: 'border-box' }}>
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Header Avatar Box */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '24px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
        <div className="skeleton skeleton-circle" style={{ width: '84px', height: '84px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton skeleton-text" style={{ width: '160px', height: '22px' }} />
          <div className="skeleton skeleton-text" style={{ width: '220px', height: '14px' }} />
          <div className="skeleton" style={{ width: '90px', height: '22px', borderRadius: '6px' }} />
        </div>
      </div>
      {/* Settings Form Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
          <div className="skeleton skeleton-text" style={{ width: '140px', height: '18px', marginBottom: '16px' }} />
          <div className="skeleton" style={{ height: '44px', borderRadius: '10px', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '44px', borderRadius: '10px' }} />
        </div>
      </div>
    </div>
  </div>
);

// 15. Universal Page Skeleton (Fallback for any route)
export const UniversalPageSkeleton = () => (
  <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px 100px', width: '100%', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
      <div className="skeleton skeleton-text" style={{ width: '150px', height: '24px' }} />
      <div className="skeleton skeleton-circle" style={{ width: '38px', height: '38px' }} />
    </div>
    <div className="skeleton" style={{ width: '100%', height: '180px', borderRadius: '16px', marginBottom: '18px' }} />
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="skeleton skeleton-text" style={{ width: '45%', height: '18px' }} />
      <div className="skeleton skeleton-text" style={{ width: '90%', height: '14px' }} />
      <div className="skeleton skeleton-text" style={{ width: '75%', height: '14px' }} />
    </div>
  </div>
);

// 16. Login & Register Skeleton (Login) - Responsive Desktop & Mobile Split
export const LoginSkeleton = () => (
  <div className="login-page-container" style={{ minHeight: '100dvh', display: 'flex', width: '100%', backgroundColor: '#FAF8F5' }}>
    {/* Left Panel: Desktop Brand Showcase */}
    <div className="login-desktop-showcase">
      <div className="login-showcase-inner">
        {/* Logo Badge Skeleton */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E7EB', marginBottom: '28px' }}>
          <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
          <div className="skeleton skeleton-text" style={{ width: '84px', height: '16px' }} />
        </div>

        {/* Title Skeleton */}
        <div className="skeleton skeleton-text" style={{ width: '80%', height: '36px', marginBottom: '12px' }} />
        <div className="skeleton skeleton-text" style={{ width: '60%', height: '36px', marginBottom: '20px' }} />

        {/* Description Skeleton */}
        <div className="skeleton skeleton-text" style={{ width: '95%', height: '16px', marginBottom: '8px' }} />
        <div className="skeleton skeleton-text" style={{ width: '70%', height: '16px', marginBottom: '32px' }} />

        {/* Feature cards skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="skeleton skeleton-text" style={{ width: '45%', height: '16px' }} />
                <div className="skeleton skeleton-text" style={{ width: '85%', height: '12px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Right Panel: Form Section (Desktop & Mobile) */}
    <div className="login-form-panel">
      <div className="login-form-card">
        {/* Mobile Topbar Skeleton */}
        <div className="login-mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="skeleton" style={{ width: '26px', height: '26px', borderRadius: '6px' }} />
            <div className="skeleton skeleton-text" style={{ width: '70px', height: '16px' }} />
          </div>
        </div>

        {/* Form Header Skeleton */}
        <div style={{ marginBottom: '22px' }}>
          <div className="skeleton skeleton-text" style={{ width: '55%', height: '26px', marginBottom: '8px' }} />
          <div className="skeleton skeleton-text" style={{ width: '80%', height: '14px' }} />
        </div>

        {/* Google Button Skeleton */}
        <div className="skeleton" style={{ width: '100%', height: '46px', borderRadius: '10px', marginBottom: '20px' }} />

        {/* Divider Skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
          <div className="skeleton skeleton-text" style={{ width: '60px', height: '12px' }} />
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
        </div>

        {/* Form Fields Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div className="skeleton skeleton-text" style={{ width: '40px', height: '14px', marginBottom: '6px' }} />
            <div className="skeleton" style={{ width: '100%', height: '46px', borderRadius: '10px' }} />
          </div>
          <div>
            <div className="skeleton skeleton-text" style={{ width: '50px', height: '14px', marginBottom: '6px' }} />
            <div className="skeleton" style={{ width: '100%', height: '46px', borderRadius: '10px' }} />
          </div>
        </div>

        {/* Submit Button Skeleton */}
        <div className="skeleton" style={{ width: '100%', height: '46px', borderRadius: '10px', marginBottom: '20px' }} />

        {/* Footer Link Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
          <div className="skeleton skeleton-text" style={{ width: '180px', height: '14px' }} />
        </div>
      </div>
    </div>
  </div>
);



// Page skeleton for the current address. Used while a page's code loads and on first load.
// More specific paths come first (/foundation/animals/new before /foundation/animals).
export const RouteSkeleton = () => {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path === '/' || path.startsWith('/feed')) return <FeedPageSkeleton />;
  if (path.startsWith('/login')) return <LoginSkeleton />;
  if (path.startsWith('/animal/')) return <div className="animal-profile-page"><AnimalProfileSkeleton /></div>;
  if (/^\/foundation\/animals\/(new|[^/]+\/edit)/.test(path)) return <AnimalFormSkeleton />;
  if (path.startsWith('/foundation/animals')) return <FoundationAnimalsSkeleton />;
  if (path.startsWith('/support-chat')) return <ChatRoomSkeleton />;
  if (path.startsWith('/chat/') || path.startsWith('/foundation/chat/') || path.startsWith('/matches') || path.startsWith('/foundation/matches')) {
    // Phones open a chat full screen; wide screens show the list beside it
    const wide = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px)').matches;
    if (!wide && /\/chat\//.test(path)) return <ChatRoomSkeleton />;
    return <ChatListSkeleton />;
  }
  if (path.startsWith('/donation')) return <DonationSkeleton />;
  if (path.startsWith('/profile')) return <UserProfileSkeleton />;
  if (path.startsWith('/report')) return <IncidentReportSkeleton />;
  if (path.startsWith('/foundation/incidents')) return <FoundationIncidentsSkeleton />;
  if (path.startsWith('/foundation/needs')) return <FoundationNeedsPageSkeleton />;
  if (path.startsWith('/foundation/pending')) return <FoundationPendingSkeleton />;
  if (path === '/foundation' || path.startsWith('/foundation/dashboard')) return <FoundationDashboardSkeleton />;
  if (path.startsWith('/verify-user') || path.startsWith('/foundation/onboarding')) return <FormPageSkeleton />;
  if (path.includes('/timeline/')) return <AdoptionTimelineSkeleton />;
  if (path.includes('/followup/')) return <AdoptionFollowupSkeleton />;
  return <UniversalPageSkeleton />;
};

// First load, while the account is still loading: the menu frame plus the page skeleton,
// instead of a blank screen. Tab count is guessed from the address (the role isn't known yet).
export function BootSkeleton() {
  const { t } = useI18n();
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const noNav = path.startsWith('/login') || path.startsWith('/foundation/onboarding');
  if (noNav) return <div className="app-container"><main className="main-content"><RouteSkeleton /></main></div>;
  const tabs = path.startsWith('/admin') || path.startsWith('/foundation/pending') ? 1 : 4;
  return (
    <div className="app-container">
      <nav className="main-nav" aria-hidden="true">
        <span className="nav-logo">
          <span className="nav-logo__mark"><BrandMark size={36} /></span>
          <span>{t('app.name.prefix')}<span className="nav-logo__accent">{t('app.name.accent')}</span></span>
        </span>
        <div className="nav-items">
          {Array.from({ length: tabs + 1 }, (_, i) => (
            <span key={i} className={`nav-item boot-nav-item ${i === tabs ? 'boot-nav-item--phone' : ''}`}>
              <span className="nav-icon"><span className="fd-sk boot-nav-item__icon" /></span>
              <span className="fd-sk boot-nav-item__label" />
            </span>
          ))}
        </div>
        <span className="nav-user boot-nav-user">
          <span className="fd-sk" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
          <span className="fd-sk" style={{ width: 110, height: 14 }} />
        </span>
      </nav>
      <main className="main-content"><RouteSkeleton /></main>
    </div>
  );
}
