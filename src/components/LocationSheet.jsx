// Location picker sheet — DESIGN.md §7.15
import { useEffect, useState } from 'react';
import { Crosshair, Search, MapPin, Info } from 'lucide-react';
import { Dialog, Button } from './ui';
import { searchCoordinatesFromAddress, detectInAppBrowser, detectPlatform } from '../lib/geo';
import './LocationSheet.css';

const ENABLE_STEPS = {
  ios: 'เปิด ตั้งค่า → ความเป็นส่วนตัวและความปลอดภัย → บริการหาตำแหน่ง → Safari (หรือเบราว์เซอร์ที่ใช้) แล้วเลือก "ขณะใช้แอป" จากนั้นรีเฟรชหน้านี้',
  android: 'แตะไอคอน 🔒 ข้างช่องที่อยู่เว็บ → สิทธิ์ → ตำแหน่ง → อนุญาต จากนั้นรีเฟรชหน้านี้',
  other: 'คลิกไอคอน 🔒 ข้างช่องที่อยู่เว็บ → ตำแหน่ง → อนุญาต จากนั้นรีเฟรชหน้านี้',
};

// "เมืองขอนแก่น, จังหวัดขอนแก่น, 40000, ประเทศไทย" -> "เมืองขอนแก่น, จังหวัดขอนแก่น"
const shortPlaceName = (displayName = '') =>
  displayName.split(',').map((s) => s.trim()).filter((s) => s && !/^\d+$/.test(s) && s !== 'ประเทศไทย').slice(0, 2).join(', ');

export function LocationSheet({ open, onClose, status, label, isLocating, onUseGps, onPickPlace }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const inApp = detectInAppBrowser();
  const platform = detectPlatform();

  useEffect(() => {
    if (!open) {
      setResult(null);
      setSearchError('');
    }
  }, [open]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError('');
    setResult(null);
    try {
      const found = await searchCoordinatesFromAddress(q);
      if (found) setResult({ ...found, name: shortPlaceName(found.displayName) || q });
      else setSearchError('ไม่พบพื้นที่นี้ ลองพิมพ์ชื่ออำเภอหรือจังหวัด');
    } catch (err) {
      setSearchError('ค้นหาไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="ตำแหน่งของคุณ">
      <p className="loc-sheet__intro">
        ใช้เพื่อแสดงน้องที่อยู่ใกล้คุณและคำนวณระยะทาง เราไม่บันทึกตำแหน่งของคุณไว้ในระบบ
      </p>

      {status === 'ready' && label && (
        <div className="loc-sheet__current">
          <MapPin size={18} aria-hidden="true" />
          <span>ตอนนี้ใช้: <strong>{label}</strong></span>
        </div>
      )}

      {inApp ? (
        <div className="loc-sheet__notice" role="note">
          <Info size={18} aria-hidden="true" />
          <span>
            คุณเปิดลิงก์จากในแอป {inApp} ซึ่งมักใช้ตำแหน่งไม่ได้ เปิดลิงก์นี้ใน Safari หรือ Chrome
            (แตะ ⋯ แล้วเลือก "เปิดในเบราว์เซอร์") หรือเลือกพื้นที่เองด้านล่าง
          </span>
        </div>
      ) : status === 'denied' ? (
        <div className="loc-sheet__notice" role="note">
          <Info size={18} aria-hidden="true" />
          <span>
            เบราว์เซอร์ปิดสิทธิ์ตำแหน่งของเว็บนี้อยู่ {ENABLE_STEPS[platform]} หรือเลือกพื้นที่เองด้านล่าง
          </span>
        </div>
      ) : null}

      <Button variant="secondary" block loading={isLocating} onClick={onUseGps} disabled={status === 'denied' && !inApp}>
        {!isLocating && <Crosshair size={18} aria-hidden="true" />}
        {isLocating ? 'กำลังหาตำแหน่ง…' : 'ใช้ตำแหน่งปัจจุบัน'}
      </Button>

      <div className="loc-sheet__divider"><span>หรือเลือกพื้นที่เอง</span></div>

      <form className="loc-sheet__search" onSubmit={handleSearch} role="search">
        <label htmlFor="loc-search" className="sr-only">ค้นหาพื้นที่</label>
        <input
          id="loc-search"
          className="ui-input"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder="เช่น เมืองขอนแก่น, บางนา, เชียงใหม่"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <Button type="submit" variant="primary" loading={searching} aria-label="ค้นหาพื้นที่" className="loc-sheet__search-btn">
          {!searching && <Search size={18} aria-hidden="true" />}
        </Button>
      </form>

      {searchError && <p className="loc-sheet__error" role="alert">{searchError}</p>}

      {result && (
        <button
          className="loc-sheet__result"
          onClick={() => onPickPlace({ latitude: result.latitude, longitude: result.longitude, name: result.name })}
        >
          <MapPin size={20} aria-hidden="true" />
          <span className="loc-sheet__result-text">
            <strong>{result.name}</strong>
            <small>แตะเพื่อใช้พื้นที่นี้</small>
          </span>
        </button>
      )}
    </Dialog>
  );
}
