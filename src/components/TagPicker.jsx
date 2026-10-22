// Tap-to-select standard tags + optional custom tags, for the foundation's animal form.
// DESIGN.md §7.19. Foundation pages are Thai-only for now, so labels here are Thai,
// with a preview of what English-language adopters will see.
import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { TAGS, TAG_GROUPS } from '../lib/tags';
import './TagPicker.css';

export function TagPicker({ ids, custom, onChange }) {
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
    ...TAGS.filter((t) => selected.has(t.id)).map((t) => t.en),
    ...custom.map((c) => c.en).filter(Boolean),
  ];
  const untranslated = custom.filter((c) => !c.en).length;

  return (
    <div className="tag-picker">
      {TAG_GROUPS.map((group) => {
        const tags = TAGS.filter((t) => t.group === group.id);
        const count = tags.filter((t) => selected.has(t.id)).length;
        const full = Boolean(group.max) && count >= group.max;
        return (
          <fieldset key={group.id} className="tag-picker__group">
            <legend>
              {group.th}
              {group.max && <span className="tag-picker__limit">เลือกได้สูงสุด {group.max} ({count}/{group.max})</span>}
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
                    title={tag.en}
                  >
                    {on && <Check size={16} aria-hidden="true" />}
                    {tag.th}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <fieldset className="tag-picker__group">
        <legend>แท็กอื่นๆ <span className="tag-picker__limit">ไม่บังคับ</span></legend>
        {custom.length > 0 && (
          <div className="tag-picker__chips">
            {custom.map((c) => (
              <span key={c.th} className="ui-chip tag-picker__custom">
                {c.th}{c.en && <span className="tag-picker__en"> · {c.en}</span>}
                <button type="button" onClick={() => removeCustom(c.th)} aria-label={`ลบแท็ก ${c.th}`}>
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
            placeholder="แท็กภาษาไทย เช่น ชอบนอนกลางวัน"
            aria-label="แท็กภาษาไทย"
          />
          <input
            className="ui-input"
            value={newEn}
            onChange={(e) => setNewEn(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder="English (ถ้ามี) เช่น Loves naps"
            aria-label="แท็กภาษาอังกฤษ ไม่บังคับ"
            lang="en"
          />
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={addCustom} disabled={!newTh.trim()}>
            <Plus size={16} aria-hidden="true" /> เพิ่ม
          </button>
        </div>
      </fieldset>

      <p className="tag-picker__preview">
        <strong>ผู้ใช้ภาษาอังกฤษจะเห็น:</strong>{' '}
        {englishPreview.length ? englishPreview.join(', ') : '—'}
        {untranslated > 0 && (
          <span className="tag-picker__warn"> (แท็กอื่นๆ {untranslated} แท็กที่ไม่มีคำแปลจะไม่แสดงในภาษาอังกฤษ)</span>
        )}
      </p>
    </div>
  );
}
