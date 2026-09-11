import React from 'react';

/**
 * 4 ขาหาบ้าน — Skeleton Loading Components
 * Shimmer placeholders that strictly match current UI designs and layouts.
 */

// 1. Swipe Card Deck Skeleton (Feed)
export const FeedCardSkeleton = () => (
  <>
    {/* Second card background in stack */}
    <div
      className="swipe-card"
      style={{
        backgroundColor: '#E2E8F0',
        borderRadius: '20px',
        border: '1px solid rgba(0,0,0,0.06)',
        transform: 'scale(0.95) translateY(8px)',
        opacity: 0.5,
        zIndex: 1,
        pointerEvents: 'none'
      }}
    />

    {/* Front card skeleton */}
    <div
      className="swipe-card"
      style={{
        backgroundColor: '#1E293B',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.09)',
        zIndex: 2,
        pointerEvents: 'none'
      }}
    >
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
        {/* Full image shimmer */}
        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 0, opacity: 0.25 }} />

        {/* Top-left chip */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            backgroundColor: 'rgba(255,255,255,0.94)',
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <div className="skeleton skeleton-circle" style={{ width: '10px', height: '10px' }} />
          <div className="skeleton skeleton-text" style={{ width: '56px', height: '12px' }} />
        </div>

        {/* Bottom overlay info skeleton */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 16px 14px',
            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.7) 50%, transparent 100%)'
          }}
        >
          {/* Name and age */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div className="skeleton skeleton-text" style={{ width: '120px', height: '22px', backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <div className="skeleton skeleton-text" style={{ width: '40px', height: '16px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          </div>

          {/* Shelter */}
          <div className="skeleton skeleton-text" style={{ width: '160px', height: '14px', marginBottom: '10px', backgroundColor: 'rgba(255,255,255,0.2)' }} />

          {/* Tags */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <div className="skeleton" style={{ width: '64px', height: '20px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.18)' }} />
            <div className="skeleton" style={{ width: '74px', height: '20px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.18)' }} />
            <div className="skeleton" style={{ width: '56px', height: '20px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.18)' }} />
          </div>

          {/* Bio line */}
          <div className="skeleton skeleton-text" style={{ width: '85%', height: '12px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </div>
      </div>
    </div>
  </>
);

// 2. Chat List Skeleton (MatchChat, FoundationMatchChat) - Split-view aligned
export const ChatListSkeleton = () => (
  <div style={{ width: '100%', display: 'flex', height: '100%', minHeight: '80dvh', boxSizing: 'border-box' }}>
    {/* Left Panel */}
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div className="skeleton skeleton-text" style={{ width: '110px', height: '24px' }} />
          <div className="skeleton" style={{ width: '54px', height: '22px', borderRadius: '12px' }} />
        </div>

        {/* 3 Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', gap: '8px', paddingBottom: '12px' }}>
          <div className="skeleton" style={{ flex: 1, height: '26px', borderRadius: '6px' }} />
          <div className="skeleton" style={{ flex: 1, height: '26px', borderRadius: '6px' }} />
          <div className="skeleton" style={{ flex: 1, height: '26px', borderRadius: '6px' }} />
        </div>

        {/* Search Bar */}
        <div style={{ padding: '14px 0' }}>
          <div className="skeleton" style={{ width: '100%', height: '38px', borderRadius: '10px' }} />
        </div>
      </div>

      {/* Chat Rows */}
      <div style={{ padding: '0 12px 20px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #F3F4F6',
              backgroundColor: i === 1 ? '#FFFBEB' : '#FFFFFF'
            }}
          >
            <div className="skeleton skeleton-circle" style={{ width: '48px', height: '48px', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton skeleton-text" style={{ width: `${80 + (i % 3) * 25}px`, height: '16px' }} />
                <div className="skeleton skeleton-text" style={{ width: '40px', height: '11px' }} />
              </div>
              <div className="skeleton skeleton-text" style={{ width: `${120 + (i % 2) * 40}px`, height: '13px' }} />
              <div className="skeleton" style={{ width: '70px', height: '18px', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Right Panel Placeholder (visible on desktop) */}
    <div
      className="hidden-on-mobile"
      style={{
        flex: 1,
        backgroundColor: '#FAF8F5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }}
    >
      <div className="skeleton skeleton-circle" style={{ width: '64px', height: '64px', marginBottom: '14px' }} />
      <div className="skeleton skeleton-text" style={{ width: '180px', height: '18px', marginBottom: '8px' }} />
      <div className="skeleton skeleton-text" style={{ width: '240px', height: '14px' }} />
    </div>
  </div>
);

// 3. Chat Room Skeleton (ChatRoom, FoundationChatRoom, SupportChat)
export const ChatRoomSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#FAF8F5' }}>
    {/* Top Header */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
        <div className="skeleton skeleton-circle" style={{ width: '42px', height: '42px', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div className="skeleton skeleton-text" style={{ width: '110px', height: '16px' }} />
          <div className="skeleton skeleton-text" style={{ width: '75px', height: '11px' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
        <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
      </div>
    </div>

    {/* Status Banner Placeholder */}
    <div style={{ padding: '10px 18px', backgroundColor: '#F0FDF4', borderBottom: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="skeleton skeleton-text" style={{ width: '220px', height: '14px' }} />
      <div className="skeleton" style={{ width: '120px', height: '30px', borderRadius: '8px' }} />
    </div>

    {/* Messages Area */}
    <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
      {/* Date Chip */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <div className="skeleton" style={{ width: '56px', height: '22px', borderRadius: '9999px' }} />
      </div>

      {/* Message 1: Application Form Card (Shelter or user) */}
      <div style={{ alignSelf: 'flex-start', maxWidth: '440px', width: '100%' }}>
        <div className="skeleton" style={{ width: '100%', height: '140px', borderRadius: '16px', border: '1.5px solid #FED7AA' }} />
      </div>

      {/* Message 2: Incoming message */}
      <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'flex-end', maxWidth: '75%' }}>
        <div className="skeleton skeleton-circle" style={{ width: '32px', height: '32px', flexShrink: 0 }} />
        <div className="skeleton" style={{ width: '180px', height: '42px', borderRadius: '16px 16px 16px 4px' }} />
      </div>

      {/* Message 3: Outgoing message */}
      <div style={{ alignSelf: 'flex-end', maxWidth: '75%' }}>
        <div className="skeleton" style={{ width: '220px', height: '46px', borderRadius: '16px 16px 4px 16px' }} />
      </div>
    </div>

    {/* Bottom Input Bar */}
    <div style={{ padding: '14px 18px', borderTop: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
      <div className="skeleton skeleton-circle" style={{ width: '36px', height: '36px', flexShrink: 0 }} />
      <div className="skeleton skeleton-circle" style={{ width: '36px', height: '36px', flexShrink: 0 }} />
      <div className="skeleton" style={{ flex: 1, height: '42px', borderRadius: '22px' }} />
      <div className="skeleton skeleton-circle" style={{ width: '40px', height: '40px', flexShrink: 0 }} />
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
  <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 16px 100px' }}>
    {/* Large Image Carousel Box */}
    <div className="skeleton" style={{ width: '100%', aspectRatio: '4/3', borderRadius: '20px', marginBottom: '20px' }} />
    {/* Name and Basic Info */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <div className="skeleton skeleton-text" style={{ width: '45%', height: '28px' }} />
      <div className="skeleton" style={{ width: '70px', height: '26px', borderRadius: '12px' }} />
    </div>
    {/* Tag badges */}
    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
      <div className="skeleton" style={{ width: '80px', height: '28px', borderRadius: '14px' }} />
      <div className="skeleton" style={{ width: '95px', height: '28px', borderRadius: '14px' }} />
      <div className="skeleton" style={{ width: '75px', height: '28px', borderRadius: '14px' }} />
    </div>
    {/* Story Card */}
    <div className="skeleton-card" style={{ marginBottom: '24px' }}>
      <div className="skeleton skeleton-text" style={{ width: '30%', height: '18px', marginBottom: '12px' }} />
      <div className="skeleton skeleton-text" style={{ width: '95%', height: '14px', marginBottom: '8px' }} />
      <div className="skeleton skeleton-text" style={{ width: '85%', height: '14px', marginBottom: '8px' }} />
      <div className="skeleton skeleton-text" style={{ width: '60%', height: '14px' }} />
    </div>
    {/* Bottom Button */}
    <div className="skeleton" style={{ width: '100%', height: '48px', borderRadius: '14px' }} />
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
