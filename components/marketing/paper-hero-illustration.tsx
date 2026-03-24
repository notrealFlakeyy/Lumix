export function PaperHeroIllustration() {
  return (
    <div className="paper-illustration-frame" aria-hidden="true">
      <svg viewBox="0 0 560 520" className="h-full w-full" role="img">
        <defs>
          <linearGradient id="paperPanel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffaf4" />
            <stop offset="100%" stopColor="#f7ecdf" />
          </linearGradient>
          <linearGradient id="paperOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f7a16e" />
            <stop offset="100%" stopColor="#eb7643" />
          </linearGradient>
          <linearGradient id="paperGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cfe4d1" />
            <stop offset="100%" stopColor="#9fc2a8" />
          </linearGradient>
          <filter id="paperShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="rgba(88,62,38,0.15)" />
          </filter>
        </defs>

        <circle cx="150" cy="136" r="82" fill="#ffd9ad" opacity="0.68" />
        <circle cx="412" cy="106" r="72" fill="#d8eadc" opacity="0.82" />
        <circle cx="430" cy="384" r="96" fill="#ffd4be" opacity="0.74" />

        <g filter="url(#paperShadow)">
          <rect x="82" y="102" width="394" height="272" rx="38" fill="url(#paperPanel)" />
        </g>

        <g transform="translate(120 140)">
          <rect width="316" height="68" rx="22" fill="#ffffff" opacity="0.94" />
          <rect x="18" y="18" width="82" height="10" rx="999" fill="#263657" opacity="0.18" />
          <rect x="18" y="36" width="132" height="10" rx="999" fill="#263657" opacity="0.1" />
          <circle cx="278" cy="34" r="16" fill="url(#paperOrange)" />
        </g>

        <g transform="translate(120 236)">
          <rect width="154" height="100" rx="28" fill="#243654" />
          <rect x="20" y="22" width="54" height="10" rx="999" fill="#ffffff" opacity="0.32" />
          <rect x="20" y="42" width="84" height="10" rx="999" fill="#ffffff" opacity="0.2" />
          <rect x="20" y="68" width="64" height="12" rx="999" fill="#ffffff" opacity="0.12" />
        </g>

        <g transform="translate(292 236)">
          <rect width="144" height="100" rx="28" fill="#fff7ed" stroke="#f2d8bf" />
          <rect x="18" y="20" width="42" height="42" rx="16" fill="url(#paperGreen)" />
          <rect x="72" y="24" width="48" height="10" rx="999" fill="#263657" opacity="0.14" />
          <rect x="72" y="42" width="34" height="10" rx="999" fill="#263657" opacity="0.1" />
          <rect x="18" y="76" width="108" height="10" rx="999" fill="#263657" opacity="0.08" />
        </g>

        <g transform="translate(78 368)">
          <rect width="176" height="78" rx="28" fill="#ffffff" stroke="#eddcc8" />
          <rect x="22" y="20" width="58" height="12" rx="999" fill="#ea7846" opacity="0.74" />
          <rect x="22" y="42" width="112" height="10" rx="999" fill="#263657" opacity="0.12" />
        </g>

        <g transform="translate(302 364)">
          <rect width="172" height="82" rx="30" fill="#243654" />
          <circle cx="34" cy="28" r="10" fill="#ef7c4c" />
          <rect x="56" y="22" width="72" height="10" rx="999" fill="#ffffff" opacity="0.3" />
          <rect x="24" y="50" width="120" height="10" rx="999" fill="#ffffff" opacity="0.12" />
        </g>

        <path
          d="M110 104 C170 40, 246 40, 314 102"
          fill="none"
          stroke="#ef7c4c"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1 18"
          opacity="0.48"
        />
        <path
          d="M328 84 C390 124, 436 180, 446 246"
          fill="none"
          stroke="#a6c8b0"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1 18"
          opacity="0.66"
        />
      </svg>
    </div>
  )
}
