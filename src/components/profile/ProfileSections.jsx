// Building blocks for the profile hub — DESIGN.md §7.16
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, PawPrint } from 'lucide-react';
import { api } from '../../services/api';
import './ProfileSections.css';
import { useI18n } from '../../i18n';
import { displayNames } from '../../lib/animal';

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
  pending: { key: 'pf.req.pending', tone: 'pending' },
  approved: { key: 'pf.req.approved', tone: 'success' },
  rejected: { key: 'pf.req.rejected', tone: 'danger' },
  adopted: { key: 'pf.req.adopted', tone: 'success' },
  completed: { key: 'pf.req.adopted', tone: 'success' },
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
  const { t, lang } = useI18n();
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
        <span className="pf-empty__icon" aria-hidden="true"><PawPrint size={26} /></span>
        <div className="pf-empty__text">
          <p className="pf-empty__title">{t('pf.req.empty')}</p>
          <p className="pf-empty__hint">{t('pf.req.emptyHint')}</p>
        </div>
        <Link to="/" className="ui-btn ui-btn--primary ui-btn--sm pf-empty__cta">{t('pf.req.browse')}</Link>
      </div>
    );
  }

  return (
    <ul className="pf-req-list">
      {shown.map((m) => {
        const animal = animals[m.animalId];
        const status = STATUS[m.status] || { key: 'pf.req.other', tone: 'neutral' };
        const name = animal ? displayNames(animal.name, lang).primary : t('common.loading');
        return (
          <li key={m.id}>
            <Link to={`/chat/${m.id}`} className="pf-req">
              <RequestThumb src={animal?.images?.[0]} />
              <span className="pf-req__text">
                <span className="pf-req__name">{name}</span>
                <span className={`pf-req__status pf-req__status--${status.tone}`}>
                  <span className="pf-req__dot" aria-hidden="true" />
                  {t(status.key)}
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
const FAQ_KEYS = ['faq.steps', 'faq.verify', 'faq.wait', 'faq.cancel'];

export function FaqList() {
  const { t } = useI18n();
  const [open, setOpen] = useState(null);
  return (
    <div className="pf-faq">
      {FAQ_KEYS.map((key, i) => {
        const isOpen = open === i;
        const q = t(`${key}.q`);
        const answer = t(`${key}.a`);
        return (
          <div key={key} className={`pf-faq__item${isOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="pf-faq__q"
              aria-expanded={isOpen}
              aria-controls={`faq-a-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{q}</span>
              <ChevronDown size={18} aria-hidden="true" />
            </button>
            {isOpen && (Array.isArray(answer) ? (
              <ol id={`faq-a-${i}`} className="pf-faq__a pf-faq__steps">
                {answer.map((step) => <li key={step}>{step}</li>)}
              </ol>
            ) : (
              <p id={`faq-a-${i}`} className="pf-faq__a">{answer}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
