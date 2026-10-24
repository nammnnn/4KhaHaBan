// Tap-to-select standard tags + optional custom tags, for the foundation's animal form.
// DESIGN.md §7.19. Labels follow the app language; custom tags take Thai plus optional English,
// with a preview of what English-language adopters will see.
import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { TAGS, TAG_GROUPS } from '../lib/tags';
import { useI18n } from '../i18n';
import './TagPicker.css';

export function TagPicker({ ids, custom, onChange }) {
  const { t, lang } = useI18n();
  const en = lang === 'en';
  const [newTh, setNewTh] = useState('');
  const [newEn, setNewEn] = useState('');
  const selected = new Set(ids);

  const toggle = (tag, groupFull) => {
    if (!selected.has(tag.id) && groupFull) return;
    const next = selected.has(tag.id) ? ids.filter((id) => id !== tag.id) : [...ids, tag.id];
    onChange({ ids: next, custom });
  };

  const addCustom = () => {
    const th = newTh.trim();
    if (!th) return;
    if (custom.some((c) => c.th === th)) return;
    onChange({ ids, custom: [...custom, { th, en: newEn.trim() }] });
    setNewTh('');
    setNewEn('');
  };

  const removeCustom = (th) => onChange({ ids, custom: custom.filter((c) => c.th !== th) });

  const englishPreview = [
    ...TAGS.filter((tag) => selected.has(tag.id)).map((tag) => tag.en),
    ...custom.map((c) => c.en).filter(Boolean),
  ];
  const untranslated = custom.filter((c) => !c.en).length;

  return (
    <div className="tag-picker">
      {TAG_GROUPS.map((group) => {
        const tags = TAGS.filter((tag) => tag.group === group.id);
        const count = tags.filter((tag) => selected.has(tag.id)).length;
        const full = Boolean(group.max) && count >= group.max;
        return (
          <fieldset key={group.id} className="tag-picker__group">
            <legend>
              {en ? group.en : group.th}
              {group.max && <span className="tag-picker__limit">{t('tp.max', { max: group.max, count })}</span>}
            </legend>
            <div className="tag-picker__chips">
              {tags.map((tag) => {
                const on = selected.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className="ui-chip"
                    aria-pressed={on}
                    disabled={!on && full}
                    onClick={() => toggle(tag, full)}
                    title={en ? tag.th : tag.en}
                  >
                    {on && <Check size={16} aria-hidden="true" />}
                    {en ? tag.en : tag.th}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <fieldset className="tag-picker__group">
        <legend>{t('tp.other')} <span className="tag-picker__limit">{t('tp.optional')}</span></legend>
        {custom.length > 0 && (
          <div className="tag-picker__chips">
            {custom.map((c) => (
              <span key={c.th} className="ui-chip tag-picker__custom">
                {c.th}{c.en && <span className="tag-picker__en"> · {c.en}</span>}
                <button type="button" onClick={() => removeCustom(c.th)} aria-label={t('tp.remove', { tag: c.th })}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="tag-picker__add">
          <input
            className="ui-input"
            value={newTh}
            onChange={(e) => setNewTh(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder={t('tp.thPh')}
            aria-label={t('tp.thAria')}
          />
          <input
            className="ui-input"
            value={newEn}
            onChange={(e) => setNewEn(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder={t('tp.enPh')}
            aria-label={t('tp.enAria')}
            lang="en"
          />
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={addCustom} disabled={!newTh.trim()}>
            <Plus size={16} aria-hidden="true" /> {t('tp.add')}
          </button>
        </div>
      </fieldset>

      <p className="tag-picker__preview">
        <strong>{t('tp.preview')}</strong>{' '}
        {englishPreview.length ? englishPreview.join(', ') : '—'}
        {untranslated > 0 && (
          <span className="tag-picker__warn">{t('tp.untranslated', { n: untranslated })}</span>
        )}
      </p>
    </div>
  );
}
