// src/components/SmallCard.jsx
import React from 'react';
import PropTypes from 'prop-types';

/**
 * SmallCard
 *
 * Props:
 * - title: string (petit titre)
 * - value: string | number (valeur principale)
 * - subtitle: string (texte secondaire ou description)
 * - icon: React node (icône à gauche)
 * - variant: 'default' | 'blue' | 'green' | 'orange' | 'purple' | 'red' (définit couleurs)
 * - className: string (classes additionnelles)
 * - onClick: function (optionnel)
 *
 * Exemple d'utilisation:
 * <SmallCard title="Traités" value={1234} subtitle="aujourd'hui" icon={<Activity />} variant="purple" />
 */

const VARIANT_STYLES = {
  default: {
    bg: 'bg-white/5',
    border: 'border-white/20',
    accent: 'text-white',
  },
  blue: {
    bg: 'bg-blue-600/10',
    border: 'border-blue-400/20',
    accent: 'text-blue-300',
  },
  green: {
    bg: 'bg-green-600/10',
    border: 'border-green-400/20',
    accent: 'text-green-300',
  },
  orange: {
    bg: 'bg-orange-600/10',
    border: 'border-orange-400/20',
    accent: 'text-orange-300',
  },
  purple: {
    bg: 'bg-purple-600/10',
    border: 'border-purple-400/20',
    accent: 'text-purple-300',
  },
  red: {
    bg: 'bg-red-600/10',
    border: 'border-red-400/20',
    accent: 'text-red-300',
  },
};

export default function SmallCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  className = '',
  onClick,
}) {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(e);
      }}
      className={`rounded-xl ${style.bg} ${style.border} border p-4 flex items-center justify-between shadow-sm transition-transform transform hover:scale-[1.01] ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-start space-x-3">
        {icon && (
          <div className={`p-2 rounded-md ${variant === 'default' ? 'bg-white/6' : 'bg-white/4'}`}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { className: 'w-6 h-6 ' + (style.accent.replace('text-', 'text-') ) }) : icon}
          </div>
        )}
        <div>
          <p className="text-xs text-gray-300">{title}</p>
          <p className={`text-xl font-semibold ${style.accent}`}>{value ?? '-'}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>
      {/* espace possible pour un badge / chevron */}
    </div>
  );
}

SmallCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subtitle: PropTypes.string,
  icon: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'blue', 'green', 'orange', 'purple', 'red']),
  className: PropTypes.string,
  onClick: PropTypes.func,
};
