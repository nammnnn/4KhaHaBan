// A dog and a cat for the error / not-found screens — simple flat SVG, animated in CSS (PetScene.css).
// variant: 'load'   both walk, "…" dots over the cat (couldn't load, still trying)
//          'search' the dog sniffs the ground, a "?" floats over the cat (page / item not found)
//          'crash'  both stopped, the dog is dizzy (page crashed)
// Decorative only; the global prefers-reduced-motion rule stops the motion.
import './PetScene.css';

const DOG = { fur: '#EFA458', far: '#DE9549', light: '#FBE3C4' };
const CAT = { fur: '#B4ABA4', far: '#A39A93', light: '#F1ECE7' };
const INK = '#3A2E27';

/** A leg that swings from the hip (see .pet__leg). */
const Leg = ({ x, top, h, w, fill, phase }) => (
  <rect className={`pet__leg pet__leg--${phase}`} x={x} y={top} width={w} height={h} rx={w / 2} fill={fill} />
);

/** Dot eye; `dizzy` draws an × instead. */
function Eye({ cx, cy, r, dizzy }) {
  if (dizzy) {
    return <path d={`M${cx - r} ${cy - r} L${cx + r} ${cy + r} M${cx + r} ${cy - r} L${cx - r} ${cy + r}`} stroke={INK} strokeWidth="2" strokeLinecap="round" />;
  }
  return <ellipse className="pet__eye" cx={cx} cy={cy} rx={r} ry={r * 1.15} fill={INK} />;
}

function Dog({ dizzy }) {
  return (
    <g className="pet pet--dog">
      <ellipse className="pet__shadow" cx="98" cy="128" rx="38" ry="3.5" />
      <g className="pet__bob">
        <path className="pet__tail pet__tail--dog" d="M66 90 C50 88 46 72 56 64" fill="none" stroke={DOG.fur} strokeWidth="9" strokeLinecap="round" />
        <Leg x={72} top={100} h={27} w={10} fill={DOG.far} phase="a" />
        <Leg x={114} top={100} h={27} w={10} fill={DOG.far} phase="b" />
        <path d="M60 94 C60 77 77 70 98 70 C121 70 136 79 136 94 C136 108 121 114 98 114 C76 114 60 108 60 94 Z" fill={DOG.fur} />
        <Leg x={82} top={102} h={26} w={10} fill={DOG.fur} phase="b" />
        <Leg x={123} top={102} h={26} w={10} fill={DOG.fur} phase="a" />
        <g className="pet__head pet__head--dog">
          <path d="M123 54 C119 40 122 32 128 33 C134 35 138 44 138 50 Z" fill={DOG.fur} />
          <path d="M150 48 C152 39 158 31 163 33 C168 35 167 46 164 55 Z" fill={DOG.fur} />
          <circle cx="144" cy="65" r="24" fill={DOG.fur} />
          <ellipse cx="145" cy="77" rx="14" ry="10" fill={DOG.light} />
          <Eye cx={136} cy={64} r={2.8} dizzy={dizzy} />
          <Eye cx={153} cy={63} r={2.8} dizzy={dizzy} />
          <ellipse cx="145" cy="72" rx="3.6" ry="2.6" fill={INK} />
        </g>
      </g>
    </g>
  );
}

function Cat() {
  return (
    <g className="pet pet--cat">
      <ellipse className="pet__shadow" cx="222" cy="128" rx="27" ry="3" />
      <g className="pet__bob pet__bob--cat">
        <path className="pet__tail pet__tail--cat" d="M198 104 C182 102 179 84 186 74" fill="none" stroke={CAT.fur} strokeWidth="6.5" strokeLinecap="round" />
        <Leg x={203} top={106} h={21} w={8} fill={CAT.far} phase="b" />
        <Leg x={229} top={106} h={21} w={8} fill={CAT.far} phase="a" />
        <path d="M194 104 C194 92 204 87 219 87 C235 87 244 93 244 104 C244 114 235 118 219 118 C204 118 194 114 194 104 Z" fill={CAT.fur} />
        <Leg x={210} top={108} h={20} w={8} fill={CAT.fur} phase="a" />
        <Leg x={236} top={108} h={20} w={8} fill={CAT.fur} phase="b" />
        <g className="pet__head pet__head--cat">
          <path d="M232 80 L233 61 L245 72 Z" fill={CAT.fur} stroke={CAT.fur} strokeWidth="3" strokeLinejoin="round" />
          <path d="M252 72 L264 61 L265 81 Z" fill={CAT.fur} stroke={CAT.fur} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="248.5" cy="87" r="18" fill={CAT.fur} />
          <ellipse cx="249" cy="96" rx="9" ry="6" fill={CAT.light} />
          <Eye cx={241} cy={87} r={2.5} />
          <Eye cx={256} cy={87} r={2.5} />
          <path d="M247 92.5 h4 l-2 2.2 z" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
        </g>
      </g>
    </g>
  );
}

export function PetScene({ variant = 'load', size = 'md' }) {
  return (
    <svg className={`pet-scene pet-scene--${variant} pet-scene--${size}`} viewBox="0 0 290 140" aria-hidden="true" focusable="false">
      <line x1="40" y1="129.5" x2="270" y2="129.5" className="pet-scene__line" />

      <Dog dizzy={variant === 'crash'} />
      <Cat />

      {variant === 'load' && (
        <g className="pet-bubble">
          <circle className="pet-bubble__dot" cx="238" cy="50" r="3" />
          <circle className="pet-bubble__dot" cx="249" cy="50" r="3" />
          <circle className="pet-bubble__dot" cx="260" cy="50" r="3" />
        </g>
      )}

      {variant === 'search' && (
        <text className="pet-question" x="258" y="54" textAnchor="middle">?</text>
      )}

      {variant === 'crash' && (
        <g className="pet-dizzy__orbit">
          <circle cx="128" cy="26" r="3" />
          <circle cx="160" cy="30" r="2.4" />
          <circle cx="144" cy="18" r="2" />
        </g>
      )}
    </svg>
  );
}
