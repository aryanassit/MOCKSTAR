export const MockStarLogo = ({ size = 32 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 32 32" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0px 4px 12px rgba(160,171,151,0.4))' }}
  >
    {/* Smooth Premium Background */}
    <rect width="32" height="32" rx="9" fill="url(#mockstar-gradient)" />
    
    {/* The "M" / Star Abstract Icon */}
    <path 
      d="M8 21.5V11.5L16 17.5L24 11.5V21.5" 
      stroke="#F3E8DA" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    
    {/* The MockStar "Star" Dot */}
    <path 
      d="M16 6L17.5 9.5L21 11L17.5 12.5L16 16L14.5 12.5L11 11L14.5 9.5L16 6Z" 
      fill="#EFE3D2"
    />

    {/* The Dynamic Gradient definition matching your theme */}
    <defs>
      <linearGradient id="mockstar-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#A0AB97" />
        <stop offset="1" stopColor="#8F9B88" />
      </linearGradient>
    </defs>
  </svg>
);