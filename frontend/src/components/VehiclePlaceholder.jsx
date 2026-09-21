import { Car } from 'lucide-react';

export default function VehiclePlaceholder({ className = 'w-12 h-8' }) {
  return (
    <div className={`${className} bg-neutral-800 border border-neutral-700 rounded flex items-center justify-center flex-shrink-0`}>
      <Car size={className.includes('w-12') ? 16 : 24} className="text-neutral-500" />
    </div>
  );
}
