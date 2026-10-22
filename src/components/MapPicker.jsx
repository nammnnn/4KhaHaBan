import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, useMap, useMapEvents } from 'react-leaflet';
import { MapPin, Search, Crosshair, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { searchCoordinatesFromAddress } from '../lib/geo';
import { useI18n } from '../i18n';
import './MapPicker.css';

// Pick a point by moving the map under a fixed centre pin (like ride-hailing apps).
// Works with a rough GPS fix (shows its accuracy circle) or with no fix at all.
// Loaded lazily — Leaflet only downloads when someone opens the map.

const THAILAND = { lat: 13.4, lng: 101.0, zoom: 6 };

function CenterWatcher({ onMove }) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onMove({ latitude: c.lat, longitude: c.lng });
    },
  });
  return null;
}

// Keep only the OpenStreetMap credit (required); drop Leaflet's prefix
function CleanAttribution() {
  const map = useMap();
  useEffect(() => { map.attributionControl?.setPrefix(false); }, [map]);
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 17), { duration: 0.6 });
  }, [target, map]);
  return null;
}

export default function MapPicker({ initial, accuracy, gps, onChange }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const startRef = useRef(initial);

  const start = startRef.current;
  const center = start ? [start.latitude, start.longitude] : [THAILAND.lat, THAILAND.lng];
  const zoom = start ? (accuracy && accuracy > 300 ? 15 : 17) : THAILAND.zoom;

  // Report the starting point too, so "confirm" works without moving the map
  useEffect(() => { if (start) onChange(start); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setNotFound(false);
    try {
      const hit = await searchCoordinatesFromAddress(query);
      if (hit) setFlyTarget({ latitude: hit.latitude, longitude: hit.longitude });
      else setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mp">
      <form className="mp-search" onSubmit={search} role="search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          className="ui-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
          placeholder={t('map.search')}
          aria-label={t('map.search')}
        />
        {searching && <Loader2 size={18} className="ui-spin mp-search__spin" aria-hidden="true" />}
      </form>
      {notFound && <p className="mp-note mp-note--warn">{t('map.notFound')}</p>}

      <div className="mp-map">
        <MapContainer center={center} zoom={zoom} zoomControl={false} attributionControl style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
          />
          {gps && accuracy && (
            <Circle
              center={[gps.latitude, gps.longitude]}
              radius={accuracy}
              pathOptions={{ color: '#B45309', weight: 1, fillColor: '#D97706', fillOpacity: 0.08 }}
            />
          )}
          <CleanAttribution />
          <CenterWatcher onMove={onChange} />
          <FlyTo target={flyTarget} />
        </MapContainer>
        {/* Fixed pin: its tip marks the map centre */}
        <span className="mp-pin" aria-hidden="true"><MapPin size={40} strokeWidth={2.2} /></span>
        {gps && (
          <button type="button" className="mp-locate" onClick={() => setFlyTarget({ ...gps })} aria-label={t('map.backToGps')} title={t('map.backToGps')}>
            <Crosshair size={20} />
          </button>
        )}
      </div>
      <p className="mp-note">{t('map.hint')}</p>
    </div>
  );
}
