// A dog and a cat for the error / not-found screens — drawn in SVG, animated in CSS (PetScene.css).
// variant: 'load'   both walk, the cat says "…" (couldn't load, still trying)
//          'search' the dog sniffs the ground, a "?" floats over the cat (page / item not found)
//          'crash'  both stopped, the dog is dizzy (page crashed)
// Decorative only; the global prefers-reduced-motion rule stops the motion.
import { useId } from 'react';
import './PetScene.css';

const DOG = { fur: '#EFA458', furDark: '#D98B3F', cream: '#FCE6C4', ink: '#3A2A1F', ear: '#F6C08F' };
const CAT = { fur: '#A39A93', furDark: '#857C76', stripe: '#7A716B', cream: '#F7F3EE', ear: '#F5B8AE', ink: '#2E2926' };
const BLUSH = '#F59E8B';

/** One leg: fur on top, white sock, round paw. Swings from the top (see .pet__leg). */
function Leg({ x, top, h, w, fur, sock, phase }) {
  const sockH = Math.round(h * 0.34);
  return (
    <g className={`pet__leg pet__leg--${phase}`}>
      <rect x={x} y={top} width={w} height={h} rx={w / 2} fill={fur} />
      <rect x={x} y={top + h - sockH} width={w} height={sockH} rx={w / 2} fill={sock} />
      <ellipse cx={x + w / 2 + 1.5} cy={top + h - 1} rx={w / 2 + 1.5} ry={2.6} fill={sock} />
    </g>
  );
}

/** Round eye with a shine; `dizzy` draws an × instead. */
function Eye({ cx, cy, r, ink, dizzy }) {
  if (dizzy) {
    const d = r * 0.9;
    return (
      <path d={`M${cx - d} ${cy - d} L${cx + d} ${cy + d} M${cx + d} ${cy - d} L${cx - d} ${cy + d}`}
        stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
    );
  }
  return (
    <g className="pet__eye">
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.12} fill={ink} />
      <circle cx={cx + r * 0.35} cy={cy - r * 0.4} r={r * 0.36} fill="#fff" />
    </g>
  );
}

function Dog({ dizzy }) {
  return (
    <g className="pet pet--dog">
      <ellipse className="pet__shadow" cx="98" cy="128" rx="42" ry="4.5" />
      <g className="pet__bob">
        {/* curled shiba tail */}
        <path className="pet__tail pet__tail--dog" d="M66 90 C50 88 44 70 55 62 C63 57 71 64 65 72"
          fill="none" stroke={DOG.fur} strokeWidth="10" strokeLinecap="round" />

        <Leg x={70} top={100} h={27} w={11} fur={DOG.furDark} sock={DOG.cream} phase="a" />
        <Leg x={113} top={100} h={27} w={11} fur={DOG.furDark} sock={DOG.cream} phase="b" />

        {/* bean body */}
        <path d="M60 94 C60 77 77 70 98 70 C121 70 136 79 136 94 C136 108 121 114 98 114 C76 114 60 108 60 94 Z" fill={DOG.fur} />
        <path d="M74 105 C84 113 112 113 124 104 C118 110 80 112 74 105 Z" fill={DOG.cream} />
        <ellipse cx="102" cy="104" rx="20" ry="7" fill={DOG.cream} />

        <Leg x={80} top={102} h={26} w={11} fur={DOG.fur} sock={DOG.cream} phase="b" />
        <Leg x={122} top={102} h={26} w={11} fur={DOG.fur} sock={DOG.cream} phase="a" />

        {/* collar + tag */}
        <path d="M122 74 C126 86 136 92 148 92" fill="none" stroke="#E2574C" strokeWidth="7" strokeLinecap="round" />
        <g className="pet__tag">
          <circle cx="138" cy="94" r="4.6" fill="#FBBF24" />
          <circle cx="138" cy="94" r="1.6" fill="#F59E0B" />
        </g>

        <g className="pet__head pet__head--dog">
          {/* ears */}
          <path d="M122 54 C118 38 122 30 128 32 C134 34 138 44 138 50 Z" fill={DOG.fur} />
          <path d="M125 50 C123 40 125 36 128 37 C132 39 134 45 134 49 Z" fill={DOG.ear} />
          <path d="M150 48 C152 38 158 30 164 32 C169 34 168 46 164 56 Z" fill={DOG.fur} />
          <path d="M154 48 C156 41 159 37 162 38 C165 40 164 47 162 52 Z" fill={DOG.ear} />
          {/* head */}
          <path d="M118 66 C118 50 130 42 144 42 C160 42 170 52 170 66 C170 80 158 88 144 88 C129 88 118 80 118 66 Z" fill={DOG.fur} />
          {/* cream mask */}
          <path d="M128 76 C128 68 136 64 144 66 C152 64 162 68 162 76 C162 84 154 88 145 88 C136 88 128 84 128 76 Z" fill={DOG.cream} />
          <ellipse cx="135" cy="59" rx="3.4" ry="2.2" fill={DOG.cream} opacity="0.9" />
          <ellipse cx="154" cy="58" rx="3.4" ry="2.2" fill={DOG.cream} opacity="0.9" />
          <Eye cx={136} cy={65} r={3.3} ink={DOG.ink} dizzy={dizzy} />
          <Eye cx={154} cy={64} r={3.3} ink={DOG.ink} dizzy={dizzy} />
          <ellipse cx="129" cy="73" rx="4.2" ry="2.6" fill={BLUSH} opacity="0.55" />
          <ellipse cx="160" cy="72" rx="4.2" ry="2.6" fill={BLUSH} opacity="0.55" />
          {/* nose + mouth */}
          <path d="M141 71 C141 68.5 149 68.5 149 71 C149 73.5 146 75 145 75 C144 75 141 73.5 141 71 Z" fill={DOG.ink} />
          <ellipse cx="143.6" cy="70.4" rx="1.3" ry="0.8" fill="#fff" opacity="0.7" />
          {dizzy ? (
            <path d="M139 80 q3 -2 6 0 q3 2 6 0" fill="none" stroke={DOG.ink} strokeWidth="1.6" strokeLinecap="round" />
          ) : (
            <path d="M145 75 v2.5 M145 77.5 q-3.2 3 -6 0.6 M145 77.5 q3.2 3 6 0.6" fill="none" stroke={DOG.ink} strokeWidth="1.6" strokeLinecap="round" />
          )}
        </g>
      </g>
    </g>
  );
}

function Cat() {
  return (
    <g className="pet pet--cat">
      <ellipse className="pet__shadow" cx="222" cy="128" rx="30" ry="3.8" />
      <g className="pet__bob pet__bob--cat">
        <path className="pet__tail pet__tail--cat" d="M198 104 C182 102 178 82 186 72 C190 67 197 69 195 76"
          fill="none" stroke={CAT.fur} strokeWidth="7" strokeLinecap="round" />
        <path className="pet__tail pet__tail--cat" d="M184 86 l5 1 M183 93 l5 0.5" stroke={CAT.stripe} strokeWidth="2.6" strokeLinecap="round" />

        <Leg x={203} top={106} h={21} w={8} fur={CAT.furDark} sock={CAT.cream} phase="b" />
        <Leg x={229} top={106} h={21} w={8} fur={CAT.furDark} sock={CAT.cream} phase="a" />

        <path d="M194 104 C194 92 204 87 219 87 C235 87 244 93 244 104 C244 114 235 118 219 118 C204 118 194 114 194 104 Z" fill={CAT.fur} />
        {/* tabby stripes */}
        <path d="M208 88.5 q2 5 0 9 M217 87.5 q2 5.5 0 10 M226 88 q2 5 0 9" fill="none" stroke={CAT.stripe} strokeWidth="2.6" strokeLinecap="round" />
        <ellipse cx="222" cy="111" rx="14" ry="5" fill={CAT.cream} />

        <Leg x={210} top={108} h={20} w={8} fur={CAT.fur} sock={CAT.cream} phase="a" />
        <Leg x={236} top={108} h={20} w={8} fur={CAT.fur} sock={CAT.cream} phase="b" />

        <g className="pet__head pet__head--cat">
          <path d="M232 80 L233 60 L245 72 Z" fill={CAT.fur} strokeLinejoin="round" stroke={CAT.fur} strokeWidth="3" />
          <path d="M235 76 L235.5 65 L242 72 Z" fill={CAT.ear} />
          <path d="M252 72 L264 60 L265 81 Z" fill={CAT.fur} strokeLinejoin="round" stroke={CAT.fur} strokeWidth="3" />
          <path d="M255 72 L262 65 L262.5 77 Z" fill={CAT.ear} />
          <path d="M230 87 C230 75 238 69 248 69 C259 69 267 76 267 87 C267 98 259 104 248 104 C238 104 230 98 230 87 Z" fill={CAT.fur} />
          <path d="M244 71 v5 M248 70.5 v6 M252 71 v5" stroke={CAT.stripe} strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="249" cy="96" rx="10" ry="6.5" fill={CAT.cream} />
          <Eye cx={241} cy={87} r={2.9} ink={CAT.ink} />
          <Eye cx={256} cy={87} r={2.9} ink={CAT.ink} />
          <ellipse cx="236" cy="94" rx="3.4" ry="2.1" fill={BLUSH} opacity="0.5" />
          <ellipse cx="262" cy="94" rx="3.4" ry="2.1" fill={BLUSH} opacity="0.5" />
          <path d="M246.5 92.5 h5 l-2.5 2.6 z" fill="#E8899A" strokeLinejoin="round" stroke="#E8899A" strokeWidth="1" />
          <path d="M249 95.5 q-2 2.4 -4 0.8 M249 95.5 q2 2.4 4 0.8" fill="none" stroke={CAT.ink} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M258 95 l10 -2 M258 97.5 l10 1" stroke={CAT.ink} strokeWidth="0.9" strokeLinecap="round" opacity="0.45" />
          <path d="M240 95 l-10 -2 M240 97.5 l-10 1" stroke={CAT.ink} strokeWidth="0.9" strokeLinecap="round" opacity="0.45" />
        </g>
      </g>
    </g>
  );
}

export function PetScene({ variant = 'load', size = 'md' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`pet-scene pet-scene--${variant} pet-scene--${size}`} viewBox="0 0 290 140" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDEBC8" stopOpacity="1" />
          <stop offset="100%" stopColor="#FDEBC8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`fade-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.82" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`mask-${id}`}><rect x="0" y="0" width="290" height="140" fill={`url(#fade-${id})`} /></mask>
      </defs>

      {/* soft warm glow behind the pets */}
      <ellipse cx="158" cy="90" rx="138" ry="52" fill={`url(#glow-${id})`} />

      {/* ground: grass tufts and pebbles slide backwards, so the pets look like they walk forward */}
      <g mask={`url(#mask-${id})`}>
        <line x1="0" y1="129.5" x2="290" y2="129.5" className="pet-scene__line" />
        <g className="pet-scene__ground">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <g key={i} transform={`translate(${i * 60} 0)`}>
              <path d="M12 129 q1.5 -6 3 0 M16 129 q1.5 -8 3 0 M20 129 q1.5 -5 3 0" className="pet-scene__tuft" />
              <ellipse cx="44" cy="131.5" rx="3" ry="1.4" className="pet-scene__pebble" />
            </g>
          ))}
        </g>
      </g>

      <Dog dizzy={variant === 'crash'} />
      <Cat />

      {variant === 'load' && (
        <g className="pet-bubble">
          <path d="M238 14 h36 a10 10 0 0 1 10 10 v8 a10 10 0 0 1 -10 10 h-22 l-8 7 l1.5 -7 h-7.5 a10 10 0 0 1 -10 -10 v-8 a10 10 0 0 1 10 -10 z" className="pet-bubble__box" />
          <circle className="pet-bubble__dot" cx="245" cy="28" r="3.2" />
          <circle className="pet-bubble__dot" cx="256" cy="28" r="3.2" />
          <circle className="pet-bubble__dot" cx="267" cy="28" r="3.2" />
        </g>
      )}

      {variant === 'search' && (
        <>
          <g className="pet-question">
            <circle cx="262" cy="34" r="13" className="pet-question__bg" />
            <text x="262" y="41" textAnchor="middle">?</text>
          </g>
          <g className="pet-sniff">
            <path d="M168 112 q4 -3 8 0 q4 3 8 0" />
            <path d="M172 104 q3 -2.4 6 0 q3 2.4 6 0" />
          </g>
        </>
      )}

      {variant === 'crash' && (
        <g className="pet-dizzy">
          <g className="pet-dizzy__orbit">
            <path d="M128 14 l2.2 5.2 5.6 .5 -4.3 3.7 1.3 5.5 -4.8 -2.9 -4.8 2.9 1.3 -5.5 -4.3 -3.7 5.6 -.5 z" />
            <path d="M162 22 l1.6 3.8 4 .4 -3.1 2.7 1 4 -3.5 -2.1 -3.5 2.1 1 -4 -3.1 -2.7 4 -.4 z" />
            <circle cx="146" cy="12" r="2.4" />
          </g>
        </g>
      )}
    </svg>
  );
}
