// A dog and a cat for the error / not-found screens — drawn in SVG, animated in CSS (PetScene.css).
// variant: 'load'   both walk, the cat says "…" (couldn't load, still trying)
//          'search' the dog sniffs the ground, a "?" floats over the cat (page / item not found)
//          'crash'  both stopped, the dog is dizzy (page crashed)
// Decorative only; the global prefers-reduced-motion rule stops the motion.
import './PetScene.css';

const DOG = { body: '#E9A15B', shade: '#C27A3A', light: '#F8DDB5', ink: '#3F2D20' };
const CAT = { body: '#8A817C', shade: '#6E6661', light: '#F3EFEA', ear: '#F4B6A6', ink: '#2F2A27' };

function Dog() {
  return (
    <g className="pet pet--dog">
      <g className="pet__bob">
        <path className="pet__tail pet__tail--dog" d="M54 66 Q40 60 38 44" fill="none" stroke={DOG.body} strokeWidth="7" strokeLinecap="round" />
        {/* far legs (darker), then body, then near legs */}
        <rect className="pet__leg pet__leg--a" x="62" y="76" width="9" height="24" rx="4.5" fill={DOG.shade} />
        <rect className="pet__leg pet__leg--b" x="100" y="76" width="9" height="24" rx="4.5" fill={DOG.shade} />
        <rect x="50" y="56" width="66" height="30" rx="15" fill={DOG.body} />
        <ellipse cx="86" cy="80" rx="22" ry="6" fill={DOG.light} />
        <rect className="pet__leg pet__leg--b" x="54" y="76" width="9" height="24" rx="4.5" fill={DOG.body} />
        <rect className="pet__leg pet__leg--a" x="92" y="76" width="9" height="24" rx="4.5" fill={DOG.body} />
        <g className="pet__head pet__head--dog">
          <circle cx="120" cy="50" r="17" fill={DOG.body} />
          <ellipse cx="134" cy="57" rx="10" ry="8" fill={DOG.light} />
          <circle cx="142" cy="53" r="3.6" fill={DOG.ink} />
          <circle cx="124" cy="45" r="2.4" fill={DOG.ink} />
          <path d="M131 62 q3 3 7 0" fill="none" stroke={DOG.ink} strokeWidth="1.6" strokeLinecap="round" />
          <ellipse className="pet__ear" cx="110" cy="50" rx="6" ry="12" transform="rotate(12 110 50)" fill={DOG.shade} />
          <ellipse cx="117" cy="55" rx="3.2" ry="2" fill="#F2A08A" opacity="0.7" />
        </g>
      </g>
    </g>
  );
}

function Cat() {
  return (
    <g className="pet pet--cat" transform="translate(14 0)">
      <g className="pet__bob pet__bob--cat">
        <path className="pet__tail pet__tail--cat" d="M164 76 Q150 72 150 56 Q150 46 158 46" fill="none" stroke={CAT.body} strokeWidth="5.5" strokeLinecap="round" />
        <rect className="pet__leg pet__leg--b" x="172" y="84" width="7" height="18" rx="3.5" fill={CAT.shade} />
        <rect className="pet__leg pet__leg--a" x="199" y="84" width="7" height="18" rx="3.5" fill={CAT.shade} />
        <rect x="160" y="68" width="50" height="22" rx="11" fill={CAT.body} />
        <rect className="pet__leg pet__leg--a" x="165" y="84" width="7" height="18" rx="3.5" fill={CAT.body} />
        <rect className="pet__leg pet__leg--b" x="192" y="84" width="7" height="18" rx="3.5" fill={CAT.body} />
        <g className="pet__head pet__head--cat">
          <path d="M202 58 L204 42 L213 53 Z" fill={CAT.body} />
          <path d="M215 53 L223 41 L226 57 Z" fill={CAT.body} />
          <path d="M205 55 L206 47 L210 53 Z" fill={CAT.ear} />
          <path d="M218 53 L222 46 L223 55 Z" fill={CAT.ear} />
          <circle cx="214" cy="63" r="13" fill={CAT.body} />
          <ellipse cx="219" cy="68" rx="7" ry="5" fill={CAT.light} />
          <circle className="pet__eye" cx="218" cy="60" r="2.2" fill={CAT.ink} />
          <path d="M224 66 l2.4 -1.6 l0.4 2.8 z" fill="#E8899A" />
          <path d="M226 69 l9 -2 M226 71 l9 1" stroke={CAT.ink} strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
        </g>
      </g>
    </g>
  );
}

export function PetScene({ variant = 'load', size = 'md' }) {
  return (
    <svg className={`pet-scene pet-scene--${variant} pet-scene--${size}`} viewBox="0 0 264 120" aria-hidden="true" focusable="false">
      {/* ground moves backwards, so the pets look like they walk forward */}
      <line className="pet-scene__ground" x1="6" y1="104" x2="258" y2="104" />
      <ellipse cx="86" cy="104" rx="36" ry="3" className="pet-scene__shadow" />
      <ellipse cx="202" cy="104" rx="26" ry="2.6" className="pet-scene__shadow" />

      <Dog />
      <Cat />

      {variant === 'load' && (
        <g transform="translate(14 0)"><g className="pet-bubble">
          <path d="M196 8 h44 a8 8 0 0 1 8 8 v12 a8 8 0 0 1 -8 8 h-30 l-8 7 l1 -7 h-7 a8 8 0 0 1 -8 -8 v-12 a8 8 0 0 1 8 -8 z" className="pet-bubble__box" />
          <circle className="pet-bubble__dot" cx="208" cy="22" r="3" />
          <circle className="pet-bubble__dot" cx="218" cy="22" r="3" />
          <circle className="pet-bubble__dot" cx="228" cy="22" r="3" />
        </g></g>
      )}

      {variant === 'search' && (
        <g transform="translate(14 0)"><g className="pet-question">
          <text x="214" y="30" textAnchor="middle">?</text>
        </g></g>
      )}

      {variant === 'crash' && (
        <g className="pet-dizzy">
          <g className="pet-dizzy__orbit">
            <path d="M120 16 l2 5 5 .5 -4 3.4 1.3 5 -4.3 -2.7 -4.3 2.7 1.3 -5 -4 -3.4 5 -.5 z" />
            <path d="M138 26 l1.4 3.4 3.6 .3 -2.8 2.4 .9 3.5 -3.1 -1.9 -3.1 1.9 .9 -3.5 -2.8 -2.4 3.6 -.3 z" />
          </g>
        </g>
      )}
    </svg>
  );
}
