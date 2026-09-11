import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

/**
 * InteractiveLocationPicker
 * แผนที่แบบ Interactive สำหรับคลิกหรือลากหมุดเพื่อปรับตำแหน่งพิกัดให้ตรงจุดจริง 100%
 */
export default function InteractiveLocationPicker({
  latitude,
  longitude,
  onChange,
  height = 220,
  zoom = 17,
  interactive = true,
  showInstruction = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ตรวจสอบหรือโหลด Leaflet library จาก CDN ครั้งเดียว
  useEffect(() => {
    if (window.L) {
      setIsLeafletReady(true);
      return;
    }

    // โหลด Leaflet CSS
    const existingCss = document.getElementById('leaflet-css');
    if (!existingCss) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // โหลด Leaflet JS
    const existingScript = document.getElementById('leaflet-js');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        setIsLeafletReady(true);
      };
      script.onerror = () => {
        console.warn('Failed to load Leaflet from CDN');
        setLoadError(true);
      };
      document.body.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => setIsLeafletReady(true));
    }
  }, []);

  // เริ่มต้นและอัปเดต Map เมื่อ Leaflet พร้อม
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current || !window.L) return;

    const lat = parseFloat(latitude) || 16.4322;
    const lng = parseFloat(longitude) || 102.8236;

    // Custom SVG Pin Icon
    const customPinIcon = window.L.divIcon({
      className: 'custom-leaflet-pin',
      html: `
        <div style="
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -100%);
          cursor: grab;
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
        ">
          <svg width="34" height="42" viewBox="0 0 24 24" fill="#DC2626" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="#FFFFFF"></circle>
          </svg>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    if (!mapInstanceRef.current) {
      try {
        if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
          mapContainerRef.current._leaflet_id = null;
        }

        // สร้าง Map instance
        const map = window.L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: zoom,
          zoomControl: false,
          attributionControl: false
        });

        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        // สร้าง Marker ที่ลากได้
        const marker = window.L.marker([lat, lng], {
          icon: customPinIcon,
          draggable: interactive
        }).addTo(map);

        if (interactive) {
          // เมื่อลากหมุดเสร็จ
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            if (onChangeRef.current) {
              onChangeRef.current(pos.lat.toFixed(6), pos.lng.toFixed(6));
            }
          });

          // เมื่อคลิกบนแผนที่ ให้ย้ายหมุดมาที่จุดคลิกทันที
          map.on('click', (e) => {
            marker.setLatLng(e.latlng);
            if (onChangeRef.current) {
              onChangeRef.current(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
            }
          });
        }

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;

        // แก้ไขปัญหา map render ขนาดไม่เต็มใน modal
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 250);
      } catch (err) {
        console.warn('[Leaflet] Init error, falling back:', err);
        setLoadError(true);
      }
    } else {
      // อัปเดตตำแหน่ง marker และแผนที่
      const map = mapInstanceRef.current;
      const marker = markerInstanceRef.current;
      if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng], map.getZoom(), { animate: true });
      }
    }

    return () => {
      // Cleanup ตอน unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [isLeafletReady]);

  // ซิงก์พิกัดเมื่อ props latitude, longitude เปลี่ยนจากภายนอก
  useEffect(() => {
    if (mapInstanceRef.current && markerInstanceRef.current && latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        markerInstanceRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom() || zoom, { animate: true });
      }
    }
  }, [latitude, longitude, zoom]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleCenterOnMarker = () => {
    if (mapInstanceRef.current && markerInstanceRef.current) {
      const pos = markerInstanceRef.current.getLatLng();
      mapInstanceRef.current.setView(pos, 18, { animate: true });
    }
  };

  if (loadError) {
    // Fallback เป็น Google Maps iframe ถ้า CDN ไม่ตอบสนอง
    return (
      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
        <iframe
          title="แผนที่"
          width="100%"
          height={height}
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          src={`https://maps.google.com/maps?q=${latitude || 16.4322},${longitude || 102.8236}&z=16&output=embed`}
        />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #E5E7EB', backgroundColor: '#F3F4F6' }}>
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: '#E5E7EB',
          cursor: interactive ? 'crosshair' : 'default'
        }}
      />

      {!isLeafletReady && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F9FAFB',
          gap: '8px',
          color: '#6B7280',
          fontSize: '0.85rem'
        }}>
          <Loader2 size={20} className="spin" />
          <span>กำลังโหลดแผนที่แบบปรับตำแหน่งได้...</span>
        </div>
      )}

      {/* Map Controls */}
      {isLeafletReady && interactive && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF'
        }}>
          <button
            type="button"
            onClick={handleZoomIn}
            title="ซูมเข้า"
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderBottom: '1px solid #E5E7EB'
            }}
          >
            <ZoomIn size={16} color="#374151" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="ซูมออก"
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderBottom: '1px solid #E5E7EB'
            }}
          >
            <ZoomOut size={16} color="#374151" />
          </button>
          <button
            type="button"
            onClick={handleCenterOnMarker}
            title="ซูมไปที่หมุด"
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Navigation size={15} color="#D97706" />
          </button>
        </div>
      )}

      {/* Instruction Badge */}
      {showInstruction && isLeafletReady && interactive && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          right: '8px',
          zIndex: 400,
          padding: '6px 10px',
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(4px)',
          color: '#FFFFFF',
          borderRadius: '6px',
          fontSize: '0.74rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <MapPin size={13} color="#F87171" />
            คลิกตรงไหนก็ได้บนแผนที่ หรือลากหมุดสีแดงเพื่อขยับไปตำแหน่งที่ถูกต้อง
          </span>
          <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>ซูมได้</span>
        </div>
      )}
    </div>
  );
}
