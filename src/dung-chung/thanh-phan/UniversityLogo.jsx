import './UniversityLogo.css';

/**
 * UniversityLogo Component
 * Renders the official DUE University Brand Logo using the authentic university crest image:
 * - /logo_due.png: Official color crest (Orange D, Green U, Blue E, Since 1975)
 * - /logo_due_white.png: Official white monochrome crest for dark backgrounds (Footer)
 * 
 * @param {'default' | 'white'} variant
 * @param {'sm' | 'md' | 'lg'} size
 * @param {boolean} showSubtitle
 * @param {string} className
 */
export default function UniversityLogo({
  variant = 'default',
  size = 'md',
  showSubtitle = false,
  className = '',
}) {
  const isWhite = variant === 'white';
  const logoSrc = isWhite ? '/logo_due_white.png' : '/logo_due.png';

  return (
    <div className={`due-brand-logo ${isWhite ? 'variant-white' : 'variant-default'} size-${size} ${className}`}>
      {/* Official Crest Image from DUE University */}
      <div className="due-shield-wrapper">
        <img
          src={logoSrc}
          alt="Logo Trường Đại học Kinh tế - ĐHĐN"
          className="due-shield-img"
        />
      </div>

      {/* University Official Typography */}
      <div className="due-title-wrapper">
        <span className="due-univ-parent">ĐẠI HỌC ĐÀ NẴNG</span>
        <span className="due-univ-name">TRƯỜNG ĐẠI HỌC KINH TẾ</span>
        {showSubtitle && (
          <span className="due-system-subtitle">HỆ THỐNG QUẢN LÝ CƠ SỞ VẬT CHẤT (BPM)</span>
        )}
      </div>
    </div>
  );
}
