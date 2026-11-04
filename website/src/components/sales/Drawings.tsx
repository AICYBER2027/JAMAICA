// Drawn pictures for the sales page, in one flat language: solid shapes, no outlines, the page's own colours.

/** The three stages: photos sent from a phone, a calendar filling in, a WhatsApp conversation. */
export function HowPicture({ step }: { step: number }) {
  if (step === 0) {
    return (
      <svg className="s-how-picture" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="1600" height="1000" fill="var(--how-ground)" />
        <rect x="560" y="80" width="480" height="960" rx="64" fill="var(--how-ink)" />
        <rect x="592" y="150" width="416" height="860" rx="24" fill="var(--how-paper)" />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = 616 + (i % 2) * 200;
          const y = 176 + Math.floor(i / 2) * 230;
          return (
            <g key={i}>
              <rect x={x} y={y} width="184" height="210" fill="var(--how-accent)" opacity={0.35 + (i % 3) * 0.2} />
              <rect x={x + 26} y={y + 120} width="132" height="50" fill="var(--how-paper)" />
              <rect x={x + 26} y={y + 100} width="132" height="22" fill="var(--how-ink)" />
            </g>
          );
        })}
        {/* the photos leaving the phone */}
        <rect x="1150" y="210" width="200" height="230" fill="var(--how-accent)" transform="rotate(8 1250 325)" />
        <rect x="1250" y="520" width="170" height="196" fill="var(--how-paper)" transform="rotate(-6 1335 618)" />
        <rect x="190" y="420" width="190" height="220" fill="var(--how-paper)" transform="rotate(-9 285 530)" />
      </svg>
    );
  }
  if (step === 1) {
    const filled = new Set([1, 2, 3, 9, 10, 15, 16, 17, 18, 24, 29, 30, 31, 36, 37, 38, 43, 44, 45, 46]);
    return (
      <svg className="s-how-picture" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="1600" height="1000" fill="var(--how-ground)" />
        {Array.from({ length: 70 }, (_, i) => {
          const col = i % 14;
          const row = Math.floor(i / 14);
          return (
            <rect
              key={i}
              x={80 + col * 104}
              y={140 + row * 150}
              width="88"
              height="126"
              rx="10"
              fill={filled.has(i) || filled.has(i - 7) ? "var(--how-ink)" : "var(--how-paper)"}
              opacity={filled.has(i) || filled.has(i - 7) ? 0.9 : 0.55}
            />
          );
        })}
      </svg>
    );
  }
  return (
    <svg className="s-how-picture" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1600" height="1000" fill="var(--how-ground)" />
      <path d="M140 150 H900 a40 40 0 0 1 40 40 V430 a40 40 0 0 1 -40 40 H260 L170 540 L180 470 H140 a40 40 0 0 1 -40 -40 V190 a40 40 0 0 1 40 -40Z" fill="var(--how-paper)" />
      {[210, 270, 330, 390].map((y, i) => (
        <rect key={y} x="170" y={y} width={[620, 520, 660, 300][i]} height="28" rx="14" fill="var(--how-ink)" opacity="0.75" />
      ))}
      <path d="M1460 560 H760 a40 40 0 0 0 -40 40 V800 a40 40 0 0 0 40 40 H1350 L1440 910 L1430 840 H1460 a40 40 0 0 0 40 -40 V600 a40 40 0 0 0 -40 -40Z" fill="var(--how-accent)" />
      {[620, 680, 740].map((y, i) => (
        <rect key={y} x="790" y={y} width={[560, 480, 360][i]} height="28" rx="14" fill="var(--how-paper)" opacity="0.9" />
      ))}
    </svg>
  );
}

/** A hotel room key on its tag. "Chave" means key in Portuguese. */
export function KeyPicture({ label }: { label: string }) {
  return (
    <svg className="s-key" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      <rect width="800" height="1000" fill="var(--key-ground)" />
      {/* the hook board */}
      <rect x="0" y="0" width="800" height="230" fill="var(--key-board)" />
      <rect x="380" y="150" width="40" height="140" rx="20" fill="var(--key-metal)" />
      {/* ring */}
      <circle cx="400" cy="330" r="62" fill="none" stroke="var(--key-metal)" strokeWidth="22" />
      {/* key */}
      <circle cx="400" cy="470" r="86" fill="var(--key-metal)" />
      <circle cx="400" cy="470" r="34" fill="var(--key-ground)" />
      <rect x="380" y="540" width="40" height="300" fill="var(--key-metal)" />
      <rect x="420" y="740" width="60" height="30" fill="var(--key-metal)" />
      <rect x="420" y="800" width="44" height="30" fill="var(--key-metal)" />
      {/* tag */}
      <path d="M470 420 L700 470 Q730 478 724 508 L690 690 Q684 720 654 714 L480 678 Z" fill="var(--key-tag)" />
      <text x="596" y="600" textAnchor="middle" fontSize="120" fontWeight="650" fill="var(--key-ground)" transform="rotate(11 596 580)" fontFamily="Bricolage Grotesque Variable, sans-serif">
        12
      </text>
    </svg>
  );
}
