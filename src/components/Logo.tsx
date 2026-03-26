interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ variant = 'light', size = 'md' }: LogoProps) => {
  const containerSizes = {
    sm: 'w-20 h-24',
    md: 'w-28 h-32',
    lg: 'w-36 h-40',
  };

  const svgSizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const titleSizes = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  const subtitleSizes = {
    sm: 'text-[6px]',
    md: 'text-[8px]',
    lg: 'text-[10px]',
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`${containerSizes[size]} bg-white rounded-2xl shadow-lg flex items-center justify-center p-2`}>
        <div className="flex flex-col items-center gap-1">
          {/* Triangle Logo */}
          <svg 
            viewBox="0 0 100 85" 
            className={svgSizes[size]}
            fill="none"
          >
            {/* Outer triangle */}
            <path 
              d="M50 8L92 77H8L50 8Z" 
              stroke="hsl(238, 75%, 45%)" 
              strokeWidth="6" 
              fill="none"
              strokeLinejoin="round"
            />
            {/* Inner circle */}
            <circle 
              cx="50" 
              cy="52" 
              r="10" 
              stroke="hsl(238, 75%, 45%)" 
              strokeWidth="5" 
              fill="none"
            />
            {/* Connecting lines */}
            <line x1="50" y1="42" x2="50" y2="25" stroke="hsl(238, 75%, 45%)" strokeWidth="5" />
            <line x1="41" y1="58" x2="28" y2="68" stroke="hsl(238, 75%, 45%)" strokeWidth="5" />
            <line x1="59" y1="58" x2="72" y2="68" stroke="hsl(238, 75%, 45%)" strokeWidth="5" />
          </svg>
          
          {/* Text */}
          <div className="text-center">
            <p className={`font-bold ${titleSizes[size]} text-primary leading-tight`}>
              Always Best Care<span className="font-normal align-top" style={{ fontSize: '60%' }}>®</span>
            </p>
            <p className={`${subtitleSizes[size]} font-medium`} style={{ color: 'hsl(195, 100%, 45%)' }}>
              senior services
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logo;
