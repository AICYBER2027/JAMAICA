// Flat drawings that stand in until a hotel sends its own photos.
// They take the hotel's colours from CSS variables: --scene-sky, --scene-a (accent), --scene-ink, --scene-ground.

import type { RoomSceneName, SceneName } from "@/lib/hotels.ts";

const sky = "var(--scene-sky)";
const acc = "var(--scene-a)";
const ink = "var(--scene-ink)";
const gnd = "var(--scene-ground)";

export function PlaceScene({ name, title }: { name: SceneName; title: string }) {
  return (
    <svg viewBox="0 0 800 1000" role="img" aria-label={title} preserveAspectRatio="xMidYMid slice" className="scene">
      <rect width="800" height="1000" fill={sky} />
      {name === "sea" && (
        <>
          <circle cx="590" cy="250" r="90" fill={gnd} />
          <path d="M0 520 C120 470 220 500 330 470 S560 430 800 480 V1000 H0Z" fill={acc} opacity="0.55" />
          <path d="M0 600 H800 V1000 H0Z" fill={acc} />
          <path d="M0 640 C80 625 160 655 240 640 S400 625 480 640 S640 655 800 640" stroke={sky} strokeWidth="6" fill="none" opacity="0.6" />
          <path d="M0 720 C100 705 200 735 300 720 S500 705 600 720 S700 735 800 720" stroke={sky} strokeWidth="6" fill="none" opacity="0.45" />
          <path d="M0 830 C200 790 420 800 800 760 V1000 H0Z" fill={gnd} />
          {/* the house: white walls, blue doors */}
          <rect x="70" y="420" width="300" height="420" fill={gnd} />
          <path d="M50 430 L220 330 L390 430Z" fill={ink} />
          {[110, 200, 290].map((x) => (
            <rect key={x} x={x} y="480" width="50" height="90" fill={acc} />
          ))}
          <rect x="190" y="690" width="70" height="150" fill={acc} />
          <rect x="110" y="690" width="50" height="70" fill={acc} />
          <rect x="290" y="690" width="50" height="70" fill={acc} />
          {/* the mango tree */}
          <rect x="470" y="640" width="26" height="200" fill={ink} />
          <circle cx="483" cy="600" r="110" fill={ink} opacity="0.9" />
        </>
      )}
      {name === "city" && (
        <>
          <rect x="0" y="0" width="800" height="1000" fill={gnd} />
          <rect x="120" y="0" width="560" height="1000" fill={sky} />
          {/* the patio arches */}
          {[160, 400].map((x) => (
            <path key={x} d={`M${x} 1000 V560 a120 120 0 0 1 240 0 V1000`} fill={gnd} />
          ))}
          <path d="M120 0 H680 V140 H120Z" fill={acc} />
          {/* tiles along the base */}
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={120 + i * 40} y="900" width="40" height="40" fill={i % 2 ? acc : ink} opacity={i % 2 ? 1 : 0.85} />
          ))}
          {/* the orange tree in its pot */}
          <rect x="385" y="560" width="30" height="270" fill={ink} />
          <circle cx="400" cy="470" r="150" fill={ink} opacity="0.92" />
          {[[340, 430], [455, 410], [400, 520], [470, 500], [330, 520], [410, 380]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="16" fill={acc} />
          ))}
          <path d="M330 830 H470 L450 900 H350Z" fill={acc} />
        </>
      )}
      {name === "hills" && (
        <>
          <path d="M0 520 L160 340 L300 470 L470 260 L640 440 L800 330 V1000 H0Z" fill={ink} opacity="0.35" />
          <path d="M0 640 L200 470 L380 620 L560 450 L800 600 V1000 H0Z" fill={acc} />
          <path d="M0 800 C200 740 520 760 800 720 V1000 H0Z" fill={ink} opacity="0.9" />
          {/* the granite house */}
          <rect x="420" y="560" width="260" height="210" fill={gnd} />
          <path d="M400 570 L550 470 L700 570Z" fill={ink} />
          <rect x="600" y="455" width="34" height="80" fill={ink} />
          <rect x="460" y="620" width="50" height="60" fill={acc} />
          <rect x="590" y="620" width="50" height="60" fill={acc} />
          <rect x="530" y="680" width="44" height="90" fill={ink} />
          <circle cx="210" cy="230" r="70" fill={gnd} />
        </>
      )}
    </svg>
  );
}

export function RoomScene({ name, title }: { name: RoomSceneName; title: string }) {
  const bed = (x: number, w: number, key?: string) => (
    <g key={key}>
      <rect x={x} y="250" width={w} height="90" fill={gnd} />
      <rect x={x} y="215" width={w} height="40" fill={ink} />
      <rect x={x + 12} y="226" width={Math.min(70, w / 2 - 18)} height="26" fill={gnd} />
      {w > 150 && <rect x={x + w - 82} y="226" width="70" height="26" fill={gnd} />}
      <rect x={x} y="290" width={w} height="50" fill={acc} />
    </g>
  );
  return (
    <svg viewBox="0 0 480 360" role="img" aria-label={title} preserveAspectRatio="xMidYMid slice" className="scene">
      <rect width="480" height="360" fill={sky} />
      <rect y="300" width="480" height="60" fill={ink} opacity="0.12" />
      {/* window */}
      <rect x="300" y="60" width="120" height="120" fill={acc} opacity="0.45" />
      <rect x="356" y="60" width="8" height="120" fill={sky} />
      <rect x="300" y="116" width="120" height="8" fill={sky} />
      {name === "double" && bed(70, 220)}
      {name === "suite" && (
        <>
          {bed(40, 250)}
          <rect x="320" y="270" width="130" height="70" fill={ink} />
          <rect x="320" y="245" width="130" height="30" fill={acc} />
        </>
      )}
      {name === "twin" && [bed(50, 130, "a"), bed(260, 130, "b")]}
      {name === "single" && bed(120, 130)}
      {name === "family" && (
        <>
          {bed(30, 210)}
          <rect x="300" y="150" width="140" height="190" fill={ink} opacity="0.85" />
          <rect x="310" y="170" width="120" height="45" fill={gnd} />
          <rect x="310" y="255" width="120" height="45" fill={gnd} />
        </>
      )}
    </svg>
  );
}
