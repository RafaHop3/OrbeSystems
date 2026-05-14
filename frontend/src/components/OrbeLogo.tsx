import Image from 'next/image';
import logo from '../../imagems/logos/Design sem nome.png';

export default function OrbeLogo({ className = '', variant = 'header' }: { className?: string, variant?: 'header' | 'giant' }) {
  const isGiant = variant === 'giant';

  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer static ring */}
      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth={isGiant ? "1" : "1.5"} opacity="0.2" />
      
      {/* Inner dashed spinning ring */}
      <circle 
        cx="50" cy="50" r="38" 
        stroke="currentColor" 
        strokeWidth={isGiant ? "1.5" : "2"} 
        strokeDasharray="4 8" 
        className="animate-spin-slow origin-center" 
        opacity="0.6"
      />
      
      {/* Horizontal orbit */}
      <ellipse 
        cx="50" cy="50" rx="48" ry="14" 
        stroke="currentColor" 
        strokeWidth={isGiant ? "1.5" : "2"} 
        className="animate-spin-slow origin-center" 
        opacity="0.8"
      />
      
      {/* Vertical orbit */}
      <ellipse 
        cx="50" cy="50" rx="14" ry="48" 
        stroke="currentColor" 
        strokeWidth={isGiant ? "1.5" : "2"} 
        className="animate-spin-reverse origin-center" 
        opacity="0.8"
      />
      
      {/* Core solid glow */}
      <circle 
        cx="50" cy="50" r="8" 
        fill="currentColor" 
        className="animate-pulse" 
      />
      
      {/* Middle tech ring */}
      <circle 
        cx="50" cy="50" r="22" 
        stroke="currentColor" 
        strokeWidth={isGiant ? "2" : "2.5"} 
        opacity="0.4" 
        strokeDasharray="2 12" 
        className="animate-spin-reverse origin-center" 
      />
    </svg>
  );
}
