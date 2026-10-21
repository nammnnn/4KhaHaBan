import React from 'react';
import { PawPrint } from 'lucide-react';
import '../pages/Login.css';
import '../pages/AnimalProfileBento.css';

/**
 * 4 ขาหาบ้าน — Skeleton Loading Components
 * Shimmer placeholders that strictly match current UI designs and layouts.
 */

// 1. Swipe Card Deck Skeleton (Feed) — same layout as SwipeCard (DESIGN.md §7.12)
export const FeedCardSkeleton = () => (
  <div className="swipe-card feed-skel" aria-hidden="true">
    <div className="feed-skel__photo">
      <PawPrint size={56} strokeWidth={1.5} className="feed-skel__paw" />
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
      <div className="skeleton skeleton-circle" style={{ width: '64px', height: '64px' }} />
    </div>
  </div>
);

// 2. Chat List & Split View Skeleton (MatchChat, FoundationMatchChat) - Responsive Desktop & Mobile
export const ChatListSkeleton = () => {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isChatRoomRoute = path.includes('/chat/');

  return (
    <div className="page-container match-page matches-split-view">
      {/* Left Panel: Matches List (hidden on mobile when chat room is active) */}
      <div className={`matches-list-panel ${isChatRoomRoute ? 'hidden-on-mobile' : ''}`}>
        {/* Header */}
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

        {/* Matches List */}
        <div className="matches-list" style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'hidden' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="match-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '16px',
                border: '1px solid #F3F4F6',
                backgroundColor: '#FFFFFF'
              }}
            >
              <div className="skeleton skeleton-circle" style={{ width: '48px', height: '48px', flexShrink: 0 }} />
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
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
    {/* Top Header Placeholder */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="skeleton skeleton-circle" style={{ width: '40px', height: '40px', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div className="skeleton skeleton-text" style={{ width: '130px', height: '16px' }} />
          <div className="skeleton skeleton-text" style={{ width: '70px', height: '11px' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
      </div>
    </div>

    {/* Center Loading State (Clean Minimalist Spinner - NO fake bubbles) */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF8F5', gap: '12px' }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '2.5px solid #F3F4F6',
          borderTopColor: 'var(--primary, #D97706)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
      <span style={{ fontSize: '0.84rem', color: '#9CA3AF', fontWeight: 500 }}>
        กำลังโหลดข้อความ...
      </span>
    </div>

    {/* Bottom Input Bar Placeholder */}
    <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
      <div className="skeleton skeleton-circle" style={{ width: '36px', height: '36px', flexShrink: 0 }} />
      <div className="skeleton" style={{ flex: 1, height: '40px', borderRadius: '20px' }} />
      <div className="skeleton skeleton-circle" style={{ width: '36px', height: '36px', flexShrink: 0 }} />
    </div>
  </div>
);


// 4. Foundation Dashboard Skeleton (Redesigned matching current UI)
export const FoundationDashboardSkeleton = () => (
  <div style={{ minHeight: '100dvh', backgroundColor: '#FAF8F5', padding: '24px 16px 90px', boxSizing: 'border-box' }}>
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div className="skeleton skeleton-text" style={{ width: '180px', height: '26px' }} />
            <div className="skeleton" style={{ width: '90px', height: '20px', borderRadius: '9999px' }} />
          </div>
          <div className="skeleton skeleton-text" style={{ width: '260px', height: '14px' }} />
        </div>
        <div className="skeleton" style={{ width: '145px', height: '42px', borderRadius: '10px' }} />
      </div>

      {/* 4 Overview Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid #E5E7EB',
              height: '100px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="skeleton skeleton-text" style={{ width: '70px', height: '14px' }} />
              <div className="skeleton" style={{ width: '30px', height: '30px', borderRadius: '8px' }} />
            </div>
            <div>
              <div className="skeleton skeleton-text" style={{ width: '50px', height: '24px', marginBottom: '4px' }} />
              <div className="skeleton skeleton-text" style={{ width: '90px', height: '11px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Operational 2-Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Box 1: Wishlist */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px 20px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div className="skeleton skeleton-text" style={{ width: '160px', height: '18px' }} />
            <div className="skeleton skeleton-text" style={{ width: '70px', height: '14px' }} />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '10px' }} />
          ))}
        </div>

        {/* Box 2: Operations & Shelter Info */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px 20px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div className="skeleton skeleton-text" style={{ width: '170px', height: '18px' }} />
            <div className="skeleton skeleton-text" style={{ width: '70px', height: '14px' }} />
          </div>
          <div className="skeleton" style={{ height: '52px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '52px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '38px', borderRadius: '10px' }} />
        </div>
      </div>

      {/* Guidance Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px 20px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="skeleton skeleton-text" style={{ width: '220px', height: '18px', marginBottom: '4px' }} />
        <div className="skeleton skeleton-text" style={{ width: '90%', height: '14px' }} />
        <div className="skeleton skeleton-text" style={{ width: '85%', height: '14px' }} />
        <div className="skeleton skeleton-text" style={{ width: '75%', height: '14px' }} />
      </div>
    </div>
  </div>
);

// 5. Animals List Skeleton (FoundationAnimals)
export const FoundationAnimalsSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '14px 18px',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '10px', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="skeleton skeleton-text" style={{ width: `${80 + (i % 3) * 20}px`, height: '18px' }} />
            <div className="skeleton" style={{ width: '65px', height: '20px', borderRadius: '6px' }} />
          </div>
          <div className="skeleton skeleton-text" style={{ width: '130px', height: '13px' }} />
        </div>
        <div className="skeleton" style={{ width: '120px', height: '36px', borderRadius: '8px', flexShrink: 0 }} />
      </div>
    ))}
  </div>
);

// 6. Incidents List Skeleton (FoundationIncidents)
export const FoundationIncidentsSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {[1, 2, 3].map(i => (
      <div
        key={i}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: '110px', height: '24px', borderRadius: '6px' }} />
          <div className="skeleton skeleton-text" style={{ width: '70px', height: '14px' }} />
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '12px', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="skeleton skeleton-text" style={{ width: '60%', height: '18px' }} />
            <div className="skeleton skeleton-text" style={{ width: '90%', height: '14px' }} />
            <div className="skeleton skeleton-text" style={{ width: '40%', height: '14px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <div className="skeleton" style={{ flex: 1, height: '40px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ flex: 1, height: '40px', borderRadius: '10px' }} />
        </div>
      </div>
    ))}
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
  <div style={{ minHeight: '100dvh', backgroundColor: '#FAF8F5', padding: '24px 16px 80px', boxSizing: 'border-box' }}>
    <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div className="skeleton" style={{ width: '38px', height: '38px', borderRadius: '8px' }} />
        <div className="skeleton skeleton-text" style={{ width: '180px', height: '22px' }} />
      </div>

      {/* Pet Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '14px 16px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
        <div className="skeleton" style={{ width: '56px', height: '56px', borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '110px', height: '18px', marginBottom: '6px' }} />
          <div className="skeleton skeleton-text" style={{ width: '130px', height: '13px' }} />
        </div>
      </div>

      {/* Milestone Card */}
      <div className="skeleton" style={{ width: '100%', height: '68px', borderRadius: '14px', marginBottom: '16px' }} />

      {/* Photo Upload Box */}
      <div className="skeleton" style={{ width: '100%', height: '130px', borderRadius: '14px', marginBottom: '16px' }} />

      {/* Health Assessment Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '14px', border: '1px solid #E5E7EB' }}>
            <div className="skeleton skeleton-text" style={{ width: '130px', height: '15px', marginBottom: '10px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="skeleton" style={{ flex: 1, height: '32px', borderRadius: '8px' }} />
              <div className="skeleton" style={{ flex: 1, height: '32px', borderRadius: '8px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="skeleton" style={{ width: '100%', height: '48px', borderRadius: '12px' }} />
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

// 10. Animal Profile Skeleton (AnimalProfile)
export const AnimalProfileSkeleton = () => (
  <div className="ap-layout" aria-hidden="true">
    <div className="ap-media">
      <div className="ap-hero"><div className="skeleton ap-photo-skeleton" /></div>
    </div>
    <div className="ap-sheet">
      <div>
        <div className="skeleton skeleton-text" style={{ width: '45%', height: '32px', marginBottom: '10px' }} />
        <div className="skeleton skeleton-text" style={{ width: '30%', height: '14px' }} />
      </div>
      <div className="skeleton" style={{ height: '64px', borderRadius: 'var(--radius-lg)' }} />
      <div style={{ display: 'flex', gap: '8px' }}>
        {[80, 96, 72].map((w) => (
          <div key={w} className="skeleton" style={{ width: `${w}px`, height: '32px', borderRadius: 'var(--radius-full)' }} />
        ))}
      </div>
      <div>
        {[95, 88, 60].map((w) => (
          <div key={w} className="skeleton skeleton-text" style={{ width: `${w}%`, height: '14px', marginBottom: '10px' }} />
        ))}
      </div>
    </div>
  </div>
);

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
export const DonationSkeleton = () => (
  <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 100px', width: '100%', boxSizing: 'border-box' }}>
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
      <div className="skeleton" style={{ width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton skeleton-text" style={{ width: '240px', height: '22px' }} />
        <div className="skeleton skeleton-text" style={{ width: '60%', height: '14px' }} />
      </div>
    </div>

    {/* 2-Column Donation Cards Grid */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      {/* Card 1 Skeleton */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6' }}>
          <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="skeleton" style={{ width: '70px', height: '18px', borderRadius: '6px' }} />
            <div className="skeleton skeleton-text" style={{ width: '140px', height: '20px' }} />
          </div>
        </div>
        <div className="skeleton skeleton-text" style={{ width: '80%', height: '14px' }} />
        <div className="skeleton" style={{ height: '42px', borderRadius: '10px' }} />
        <div className="skeleton" style={{ height: '64px', borderRadius: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="skeleton" style={{ height: '54px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '54px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '54px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '54px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ gridColumn: 'span 2', height: '44px', borderRadius: '10px' }} />
        </div>
        <div className="skeleton" style={{ height: '46px', borderRadius: '10px', marginTop: '10px' }} />
      </div>

      {/* Card 2 Skeleton */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6' }}>
          <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="skeleton" style={{ width: '80px', height: '18px', borderRadius: '6px' }} />
            <div className="skeleton skeleton-text" style={{ width: '150px', height: '20px' }} />
          </div>
        </div>
        <div className="skeleton skeleton-text" style={{ width: '85%', height: '14px' }} />
        <div className="skeleton" style={{ height: '42px', borderRadius: '10px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="skeleton skeleton-text" style={{ width: '120px', height: '14px' }} />
                <div className="skeleton" style={{ width: '50px', height: '16px', borderRadius: '6px' }} />
              </div>
              <div className="skeleton" style={{ width: '100%', height: '8px', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
        <div className="skeleton" style={{ height: '46px', borderRadius: '10px', marginTop: 'auto' }} />
      </div>
    </div>
  </div>
);

// 13.1 Incident Report Page Skeleton (IncidentReport)
export const IncidentReportSkeleton = () => (
  <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px 100px', width: '100%', boxSizing: 'border-box' }}>
    {/* Top Header Card */}
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      border: '1px solid #E5E7EB',
      padding: '20px 24px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      display: 'flex',
      alignItems: 'center',
      gap: '14px'
    }}>
      <div className="skeleton" style={{ width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton skeleton-text" style={{ width: '220px', height: '22px' }} />
        <div className="skeleton skeleton-text" style={{ width: '60%', height: '14px' }} />
      </div>
    </div>

    {/* Tab Switcher & Live Stats Row (Left Tabs + Right Stats) */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        backgroundColor: '#F3F4F6',
        padding: '4px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '380px',
        gap: '4px'
      }}>
        <div className="skeleton" style={{ flex: 1, height: '38px', borderRadius: '8px' }} />
        <div className="skeleton" style={{ flex: 1, height: '38px', borderRadius: '8px' }} />
      </div>
      <div className="skeleton" style={{ width: '210px', height: '36px', borderRadius: '12px' }} />
    </div>

    {/* Form Card Skeleton */}
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      border: '1px solid #E5E7EB',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Stepper Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6' }}>
        <div className="skeleton" style={{ width: '30%', height: '32px', borderRadius: '8px' }} />
        <div className="skeleton" style={{ width: '30%', height: '32px', borderRadius: '8px' }} />
        <div className="skeleton" style={{ width: '30%', height: '32px', borderRadius: '8px' }} />
      </div>
      {/* Form Fields */}
      <div className="skeleton skeleton-text" style={{ width: '120px', height: '16px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />
      </div>
      <div className="skeleton skeleton-text" style={{ width: '140px', height: '16px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div className="skeleton" style={{ height: '50px', borderRadius: '10px' }} />
        <div className="skeleton" style={{ height: '50px', borderRadius: '10px' }} />
        <div className="skeleton" style={{ height: '50px', borderRadius: '10px' }} />
      </div>
      <div className="skeleton" style={{ height: '90px', borderRadius: '10px' }} />
      <div className="skeleton" style={{ height: '46px', borderRadius: '10px', marginTop: '10px' }} />
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

