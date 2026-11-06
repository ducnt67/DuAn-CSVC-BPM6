import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, RefreshCw } from 'lucide-react';
import './PageSkeleton.css';

// Khối xám có hiệu ứng ánh sáng chạy qua (dùng chung một dải sáng cho cả trang nên chạy đồng bộ).
function Bone({ w = '100%', h = 12, r, className = '', style }) {
  return <span className={`skel ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function HeaderBones({ withAction = false }) {
  return (
    <div className="skel-header">
      <div className="skel-header__text">
        <Bone w={320} h={26} r={8} />
        <Bone w={460} h={13} />
      </div>
      {withAction && <Bone w={150} h={38} r={8} />}
    </div>
  );
}

const ROW_WIDTHS = [
  ['62%', '78%', '54%', '70%', '48%', '66%'],
  ['84%', '58%', '72%', '64%', '80%', '52%'],
];

function ListBones({ toolbar }) {
  return (
    <>
      <HeaderBones />
      {toolbar === 'tabs' ? (
        <div className="skel-tabs">
          <Bone w={150} h={38} r={8} />
          <Bone w={150} h={38} r={8} />
          <Bone w={120} h={38} r={8} />
        </div>
      ) : (
        <div className="skel-card skel-filters">
          <Bone w="34%" h={36} r={8} />
          <Bone w="16%" h={36} r={8} />
          <Bone w="16%" h={36} r={8} />
          <Bone w="16%" h={36} r={8} />
        </div>
      )}
      <div className="skel-card skel-table">
        <div className="skel-table__head">
          {[60, 140, 110, 70, 80, 110, 70, 80].map((w, i) => <Bone key={i} w={w} h={10} />)}
        </div>
        {Array.from({ length: 6 }, (_, row) => (
          <div className="skel-table__row" key={row} style={{ animationDelay: `${row * 60}ms` }}>
            <div className="skel-col skel-col--code">
              <Bone w={64} h={13} />
              <Bone w={46} h={22} r={6} />
            </div>
            <div className="skel-col skel-col--wide">
              <Bone w={ROW_WIDTHS[0][row]} h={13} />
              <Bone w={ROW_WIDTHS[1][row]} h={10} />
            </div>
            <div className="skel-col">
              <Bone w="80%" h={13} />
              <Bone w="60%" h={10} />
            </div>
            <div className="skel-col skel-col--pill"><Bone w={78} h={24} r={999} /></div>
            <div className="skel-col"><Bone w="70%" h={12} /></div>
            <div className="skel-col"><Bone w="85%" h={12} /></div>
            <div className="skel-col skel-col--pill"><Bone w={64} h={22} r={999} /></div>
            <div className="skel-col skel-col--action"><Bone w={92} h={32} r={8} /></div>
          </div>
        ))}
      </div>
    </>
  );
}

function DashboardBones() {
  return (
    <>
      <HeaderBones withAction />
      <div className="skel-stats">
        {Array.from({ length: 4 }, (_, i) => (
          <div className="skel-card skel-stat" key={i}>
            <div className="skel-stat__top">
              <Bone w="55%" h={11} />
              <Bone w={34} h={34} r={10} />
            </div>
            <Bone w="40%" h={28} r={8} />
            <Bone w="70%" h={10} />
          </div>
        ))}
      </div>
      <div className="skel-grid-2">
        <div className="skel-card skel-chart">
          <Bone w="40%" h={14} />
          <div className="skel-bars">
            {[58, 82, 46, 92, 70, 38, 76].map((h, i) => <Bone key={i} w="100%" h={`${h}%`} r={4} />)}
          </div>
        </div>
        <div className="skel-card skel-chart">
          <Bone w="45%" h={14} />
          <div className="skel-donut-wrap">
            <span className="skel skel-donut" />
            <div className="skel-legend">
              {[0, 1, 2, 3].map((i) => <Bone key={i} w={`${80 - i * 12}%`} h={11} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="skel-card skel-table">
        {Array.from({ length: 4 }, (_, row) => (
          <div className="skel-table__row" key={row}>
            <div className="skel-col skel-col--code"><Bone w={64} h={13} /></div>
            <div className="skel-col skel-col--wide"><Bone w={ROW_WIDTHS[0][row]} h={13} /></div>
            <div className="skel-col skel-col--pill"><Bone w={70} h={22} r={999} /></div>
            <div className="skel-col"><Bone w="60%" h={12} /></div>
          </div>
        ))}
      </div>
    </>
  );
}

function DetailBones() {
  return (
    <>
      <div className="skel-card skel-detail-head">
        <div className="skel-row-gap">
          <Bone w={84} h={26} r={8} />
          <Bone w={92} h={24} r={999} />
          <Bone w={104} h={24} r={999} />
        </div>
        <Bone w="52%" h={26} r={8} />
        <div className="skel-row-gap">
          <Bone w={220} h={12} />
          <Bone w={160} h={12} />
          <Bone w={240} h={12} />
        </div>
        <Bone w={150} h={36} r={8} />
      </div>
      <div className="skel-card skel-block">
        <div className="skel-row-gap">
          <Bone w={36} h={36} r={10} />
          <div className="skel-stack">
            <Bone w={120} h={14} />
            <Bone w={220} h={10} />
          </div>
        </div>
        <Bone w="90%" h={12} />
        <div className="skel-grid-4">
          {[0, 1, 2, 3].map((i) => <Bone key={i} w="100%" h={64} r={8} />)}
        </div>
      </div>
      <div className="skel-grid-detail">
        <div className="skel-card skel-block">
          <Bone w="35%" h={14} />
          {Array.from({ length: 5 }, (_, i) => (
            <div className="skel-step" key={i}>
              <span className="skel skel-dot" />
              <div className="skel-stack">
                <Bone w={`${60 - i * 6}%`} h={12} />
                <Bone w={`${40 - i * 4}%`} h={10} />
              </div>
            </div>
          ))}
        </div>
        <div className="skel-card skel-block">
          <Bone w="45%" h={14} />
          {Array.from({ length: 6 }, (_, i) => (
            <div className="skel-kv" key={i}>
              <Bone w="38%" h={10} />
              <Bone w="52%" h={12} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FormBones() {
  return (
    <>
      <HeaderBones />
      <div className="skel-card skel-block">
        <div className="skel-form-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="skel-stack" key={i}>
              <Bone w="30%" h={11} />
              <Bone w="100%" h={38} r={8} />
            </div>
          ))}
        </div>
        <div className="skel-stack">
          <Bone w="18%" h={11} />
          <Bone w="100%" h={110} r={8} />
        </div>
        <div className="skel-row-gap skel-row-gap--end">
          <Bone w={96} h={38} r={8} />
          <Bone w={140} h={38} r={8} />
        </div>
      </div>
    </>
  );
}

const VARIANTS = { list: ListBones, dashboard: DashboardBones, detail: DetailBones, form: FormBones };

/**
 * Skeleton cả trang trong lúc tải dữ liệu nghiệp vụ sau khi đăng nhập.
 * variant: list | dashboard | detail | form; toolbar (list): filters | tabs.
 */
export default function PageSkeleton({ variant = 'list', toolbar = 'filters', error = '', onRetry }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div className="skel-error" role="alert">
        <span className="skel-error__icon"><AlertTriangle size={22} /></span>
        <h2>Chưa tải được dữ liệu</h2>
        <p>{error}</p>
        {onRetry && (
          <button type="button" className="skel-error__retry" onClick={onRetry}>
            <RefreshCw size={15} /> Thử lại
          </button>
        )}
      </div>
    );
  }

  const Bones = VARIANTS[variant] || ListBones;
  return (
    <div className="skel-page" role="status" aria-live="polite" aria-busy="true">
      <span className="skel-sr-only">Đang tải dữ liệu…</span>
      {slow && (
        <div className="skel-slow">
          <Clock3 size={14} />
          Máy chủ đang khởi động lại sau thời gian không hoạt động, lần đầu có thể mất tới 30 giây…
        </div>
      )}
      <Bones toolbar={toolbar} />
    </div>
  );
}
