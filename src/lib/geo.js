/**
 * Geo Utility: Haversine distance calculation and formatting for 4KhaHaBan
 */

// พิกัดเริ่มต้นใจกลางกรุงเทพมหานคร (เสาชิงช้า / พระบรมมหาราชวัง) ใช้เป็นค่าสำรองกรณีไม่อนุญาตเปิด GPS
export const DEFAULT_USER_COORDS = {
  latitude: 13.7563,
  longitude: 100.5018
};

/**
 * คำนวณระยะทางระหว่างจุดพิกัด 2 จุดบนผิวโลก (Haversine Formula)
 * @param {number} lat1 ละติจูดจุดที่ 1
 * @param {number} lon1 ลองจิจูดจุดที่ 1
 * @param {number} lat2 ละติจูดจุดที่ 2
 * @param {number} lon2 ลองจิจูดจุดที่ 2
 * @returns {number|null} ระยะทางเป็นกิโลเมตร (ทศนิยม 1 ตำแหน่ง) หรือ null ถ้าพิกัดไม่สมบูรณ์
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const nLat1 = parseFloat(lat1);
  const nLon1 = parseFloat(lon1);
  const nLat2 = parseFloat(lat2);
  const nLon2 = parseFloat(lon2);

  if (
    isNaN(nLat1) || isNaN(nLon1) ||
    isNaN(nLat2) || isNaN(nLon2)
  ) {
    return null;
  }

  const R = 6371; // รัศมีโลกเฉลี่ย (กม.)
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

/**
 * จัดรูปแบบข้อความระยะทางสำหรับแสดงผลบน UI
 * @param {number|null} distanceKm ระยะทางเป็นกิโลเมตร
 * @returns {string} เช่น "< 1 กม.", "3.5 กม." หรือ ""
 */
export function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return '';
  }
  if (distanceKm < 1) {
    return '< 1 กม.';
  }
  return `${distanceKm.toFixed(1)} กม.`;
}

/**
 * ดึงพิกัดปัจจุบันของผู้ใช้ผ่าน Geolocation API
 * @param {boolean} fallbackToDefault หากผู้ใช้ปฏิเสธ จะคืนค่าพิกัด กทม. แทนหรือไม่
 * @returns {Promise<{ latitude: number, longitude: number, isFallback: boolean }>}
 */
export function getUserCoordinates(fallbackToDefault = true) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (fallbackToDefault) {
        resolve({ ...DEFAULT_USER_COORDS, isFallback: true });
      } else {
        resolve(null);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          isFallback: false
        });
      },
      (error) => {
        console.warn('Geolocation access failed or denied:', error.message);
        if (fallbackToDefault) {
          resolve({ ...DEFAULT_USER_COORDS, isFallback: true });
        } else {
          resolve(null);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 60000
      }
    );
  });
}

/**
 * แปลงพิกัดจากข้อความรูปแบบต่างๆ เช่น:
 * - DMS จาก Google Maps: 16°28'19.4"N 102°49'22.8"E หรือ 16°28'19.4"N, 102°49'22.8"E
 * - เลขทศนิยมคู่: 16.472056, 102.823000 หรือ 16.472056 102.823000
 * - ลิงก์ Google Maps: https://www.google.com/maps/...@16.472056,102.823000...
 * @param {string} text 
 * @returns {{ latitude: number, longitude: number } | null}
 */
export function parseCoordinatesFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const raw = text.trim();

  // 1. Google Maps URL (@lat,lon หรือ ?q=lat,lon)
  const urlMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || raw.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]);
    const lon = parseFloat(urlMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lon.toFixed(6)) };
    }
  }

  // 2. รูปแบบ DMS (องศา ลิปดา ฟิลิปดา) เช่น 16°28'19.4"N 102°49'22.8"E
  const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+([\d.]+)["]?\s*([NSns])[,|\s]+(\d+)[°\s]+(\d+)['\s]+([\d.]+)["]?\s*([EWew])/;
  const dmsMatch = raw.match(dmsRegex);
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]);
    const latMin = parseFloat(dmsMatch[2]);
    const latSec = parseFloat(dmsMatch[3]);
    const latDir = dmsMatch[4].toUpperCase();

    const lonDeg = parseFloat(dmsMatch[5]);
    const lonMin = parseFloat(dmsMatch[6]);
    const lonSec = parseFloat(dmsMatch[7]);
    const lonDir = dmsMatch[8].toUpperCase();

    let lat = latDeg + latMin / 60 + latSec / 3600;
    if (latDir === 'S') lat = -lat;

    let lon = lonDeg + lonMin / 60 + lonSec / 3600;
    if (lonDir === 'W') lon = -lon;

    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lon.toFixed(6)) };
    }
  }

  // 3. รูปแบบทศนิยมคู่ เช่น 16.472056, 102.823000 หรือ 16.472056 102.823000
  const decRegex = /^(-?\d+\.\d{3,})[,\s]+(-?\d+\.\d{3,})$/;
  const decMatch = raw.match(decRegex);
  if (decMatch) {
    const lat = parseFloat(decMatch[1]);
    const lon = parseFloat(decMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lon.toFixed(6)) };
    }
  }

  return null;
}

/**
 * ตัดคำนำหน้าซ้ำซ้อน เช่น "อำเภอเมืองขอนแก่น" ไม่ให้ซ้ำเป็น "อ.อำเภอ..."
 */
function cleanThaiPrefix(text, type) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  if (type === 'subdistrict') {
    cleaned = cleaned.replace(/^(ตำบล|ต\.)\s*/, '');
    return cleaned;
  }
  if (type === 'district') {
    cleaned = cleaned.replace(/^(อำเภอ|อ\.|เขต)\s*/, '');
    return cleaned;
  }
  if (type === 'province') {
    cleaned = cleaned.replace(/^(จังหวัด|จ\.)\s*/, '');
    return cleaned;
  }
  return cleaned;
}

// In-memory cache to reduce network calls
const geocodeCache = new Map();
const reverseGeocodeCache = new Map();

/**
 * Helper to fetch Nominatim Search API
 */
async function fetchNominatimSearch(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=th&limit=1&accept-language=th`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[geo] Nominatim search error:', err);
    return null;
  }
}

/**
 * แปลงข้อความที่อยู่หรือพิกัดเป็นพิกัด GPS ละติจูด, ลองจิจูด (Geocoding)
 * รองรับทั้งชื่อสถานที่ และพิกัด Google Maps เช่น "16°28'19.4\"N 102°49'22.8\"E"
 * @param {string} addressQuery ข้อความที่อยู่ หรือ พิกัด DMS / ลิงก์
 * @returns {Promise<{ latitude: number, longitude: number, displayName: string } | null>}
 */
export async function searchCoordinatesFromAddress(addressQuery) {
  if (!addressQuery || typeof addressQuery !== 'string' || !addressQuery.trim()) {
    return null;
  }

  const query = addressQuery.trim();

  // 1. ตรวจสอบว่าผู้ใช้ป้อนพิกัด DMS หรือตัวเลขพิกัดมาโดยตรงหรือไม่
  const parsedCoords = parseCoordinatesFromText(query);
  if (parsedCoords) {
    return {
      latitude: parsedCoords.latitude,
      longitude: parsedCoords.longitude,
      displayName: `พิกัด ${parsedCoords.latitude}, ${parsedCoords.longitude}`
    };
  }

  if (geocodeCache.has(query)) {
    return geocodeCache.get(query);
  }

  try {
    // 2. ค้นหาด้วยข้อความเต็ม
    let data = await fetchNominatimSearch(query);

    // 3. ถ้าไม่พบ ลองตัดเลขที่บ้านข้างหน้าออก
    if (!data || data.length === 0) {
      const strippedHouseNo = query.replace(/^[0-9]+(\/[0-9]+)?\s*(หมู่\s*[0-9]+)?\s*/i, '').trim();
      if (strippedHouseNo && strippedHouseNo !== query) {
        data = await fetchNominatimSearch(strippedHouseNo);
      }
    }

    // 4. ถ้ายังไม่พบ ลองค้นหาด้วยการตัดคำนำหน้า "ต.", "อ.", "จ."
    if (!data || data.length === 0) {
      const simplified = query
        .replace(/ต\.|ตำบล/g, ' ')
        .replace(/อ\.|อำเภอ|เขต/g, ' ')
        .replace(/จ\.|จังหวัด/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (simplified && simplified !== query) {
        data = await fetchNominatimSearch(simplified);
      }
    }

    if (data && data.length > 0) {
      const item = data[0];
      const result = {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        displayName: item.display_name
      };
      geocodeCache.set(query, result);
      return result;
    }

    return null;
  } catch (err) {
    console.warn('[geo] Error geocoding address:', err);
    return null;
  }
}

/**
 * แปลงพิกัด GPS ละติจูด, ลองจิจูด เป็นชื่อที่อยู่ภาษาไทย (Reverse Geocoding)
 * พร้อมจัดรูปแบบภาษาไทยถูกต้อง ปราศจากคำซ้ำ เช่น "อ.อำเภอ" หรือ "จ.จังหวัด"
 * @param {number|string} latitude 
 * @param {number|string} longitude 
 * @returns {Promise<{ formattedAddress: string, displayName: string, details: object } | null>}
 */
export async function getAddressFromCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lon)) return null;

  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  if (reverseGeocodeCache.has(key)) {
    return reverseGeocodeCache.get(key);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=th`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.address) return null;

    const addr = data.address;
    const isBkk = addr.state === 'กรุงเทพมหานคร' || addr.province === 'กรุงเทพมหานคร' || addr.city === 'กรุงเทพมหานคร';

    const parts = [];

    // ชื่อสถานที่สำคัญ / อาคาร / มหาวิทยาลัย (ถ้ามี)
    const placeName = addr.amenity || addr.building || addr.university || addr.college || addr.school || addr.hospital || addr.office;
    if (placeName) {
      parts.push(placeName);
    }

    // ถนน
    if (addr.road) {
      const cleanRoad = addr.road.replace(/^(ถนน|ถ\.)\s*/, '');
      parts.push(`ถ.${cleanRoad}`);
    }
    
    // ตำบล / แขวง
    const rawSub = addr.suburb || addr.village || addr.quarter || addr.neighbourhood || addr.subdistrict;
    if (rawSub) {
      const cleanSub = cleanThaiPrefix(rawSub, 'subdistrict');
      if (cleanSub) {
        parts.push(isBkk ? `แขวง${cleanSub}` : `ต.${cleanSub}`);
      }
    }

    // อำเภอ / เขต
    const rawDist = addr.city_district || addr.district || addr.county || addr.municipality;
    if (rawDist) {
      const cleanDist = cleanThaiPrefix(rawDist, 'district');
      if (cleanDist) {
        parts.push(isBkk ? `เขต${cleanDist}` : `อ.${cleanDist}`);
      }
    }

    // จังหวัด
    const rawProv = addr.state || addr.province || addr.city;
    if (rawProv) {
      const cleanProv = cleanThaiPrefix(rawProv, 'province');
      const cleanDist = rawDist ? cleanThaiPrefix(rawDist, 'district') : '';
      if (cleanProv && cleanProv !== cleanDist) {
        parts.push(isBkk ? 'กรุงเทพมหานคร' : `จ.${cleanProv}`);
      }
    }

    // รหัสไปรษณีย์
    if (addr.postcode) {
      parts.push(addr.postcode);
    }

    const formattedAddress = parts.length > 0 ? parts.join(' ') : data.display_name;
    const result = {
      formattedAddress,
      displayName: data.display_name,
      details: addr
    };

    reverseGeocodeCache.set(key, result);
    return result;
  } catch (err) {
    console.warn('[geo] Error reverse geocoding:', err);
    return null;
  }
}

