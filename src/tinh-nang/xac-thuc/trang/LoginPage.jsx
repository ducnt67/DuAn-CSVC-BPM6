import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { ROLES, ROLE_LABELS } from '../../../dung-chung/hang-so/roles';
import {
  Lock, User, Eye, EyeOff, LogIn,
  ShieldCheck, Phone, Mail, CheckCircle, ArrowRight, Info
} from 'lucide-react';
import Button from '../../../dung-chung/thanh-phan/Button';
import UniversityLogo from '../../../dung-chung/thanh-phan/UniversityLogo';
import Footer from '../../../dung-chung/bo-cuc/Footer';

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || '123';

export default function LoginPage() {
  const { users, login, addToast } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState('nmanh');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const result = await login(username, password, rememberMe);
    setLoading(false);

    if (result.success) {
      addToast(`Đăng nhập thành công! Xin chào ${result.user.name}`, 'success');
      const targetPath =
        result.user.role === ROLES.REQUESTER
          ? '/my-requests'
          : result.user.role === ROLES.FACILITY_ADMIN
          ? '/requests'
          : '/dashboard';
      navigate(targetPath);
    } else {
      setErrorMessage(result.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
  };

  // Helper to prefill demo credentials
  const handleSelectDemoAccount = async (user, autoLogin = false) => {
    setUsername(user.username);
    setPassword(DEMO_PASSWORD);
    setErrorMessage('');

    if (autoLogin) {
      setLoading(true);
      const result = await login(user.username, DEMO_PASSWORD, rememberMe);
      setLoading(false);
      if (result.success) {
        addToast(`Đăng nhập thành công với vai trò ${ROLE_LABELS[user.role]}`, 'success');
        const targetPath =
          user.role === ROLES.REQUESTER
            ? '/my-requests'
            : user.role === ROLES.FACILITY_ADMIN
            ? '/requests'
            : '/dashboard';
        navigate(targetPath);
      } else {
        setErrorMessage(result.message || 'Không thể đăng nhập bằng tài khoản demo.');
      }
    } else {
      addToast(`Đã điền thông tin tài khoản: ${user.name} (${user.username})`, 'info');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f0f4f8',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Top DUE Brand Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-due-topbar)',
          color: '#ffffff',
          fontSize: '0.75rem',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Phone size={13} /> (84.236) 3525656
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={13} /> i.t.c@due.edu.vn
          </span>
        </div>
        <div style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
          CỔNG THÔNG TIN QUẢN LÝ CƠ SỞ VẬT CHẤT – TRƯỜNG ĐẠI HỌC KINH TẾ
        </div>
      </div>

      {/* Official Header Banner matching Image 1 */}
      <header
        style={{
          backgroundColor: '#ffffff',
          padding: '12px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <UniversityLogo variant="default" size="sm" showSubtitle={true} />
        <div style={{ fontSize: '0.75rem', color: 'var(--color-due-blue)', fontWeight: 700, letterSpacing: '0.04em' }}>
          CỔNG ĐĂNG NHẬP QUY TRÌNH CSVC (BPM)
        </div>
      </header>

      {/* Main Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 16px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1040,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 30px rgba(0, 48, 100, 0.08)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}
        >
          {/* Left Column: University Presentation */}
          <div
            style={{
              background: 'linear-gradient(145deg, #0054a6 0%, #00376d 100%)',
              color: '#ffffff',
              padding: '44px 36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            <div>
              {/* Emblem with UniversityLogo */}
              <div style={{ marginBottom: 28 }}>
                <UniversityLogo variant="white" size="md" />
              </div>

              <h1
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  lineHeight: 1.3,
                  marginBottom: 16,
                  color: '#ffffff',
                }}
              >
                Hệ thống Quản lý <br />
                <span style={{ color: '#ffb86c' }}>Sửa chữa Cơ sở vật chất</span>
              </h1>

              <p
                style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  color: '#dbeafe',
                  marginBottom: 24,
                }}
              >
                Hệ thống quản lý quy trình công tác sửa chữa, bảo dưỡng thiết bị và cơ sở hạ tầng
                phòng học, phục vụ giảng viên, cán bộ quản lý và Ban Giám hiệu.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  paddingTop: 18,
                  borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '0.8125rem',
                  color: '#e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={16} color="#68d391" />
                  <span>Tiếp nhận sự cố & khảo sát kỹ thuật tự động</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={16} color="#68d391" />
                  <span>Trình duyệt phương án kinh phí đến Ban Giám hiệu</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={16} color="#68d391" />
                  <span>Nghiệm thu thực tế và theo dõi lịch sử bảo trì</span>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 36,
                paddingTop: 16,
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '0.75rem',
                color: '#93c5fd',
              }}
            >
              Hệ thống Quản lý Quy trình Nghiệp vụ (BPM) &copy; DUE Facility Management
            </div>
          </div>

          {/* Right Column: Real Login Form & Demo Credentials */}
          <div style={{ padding: '40px 36px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 24 }}>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: 'var(--color-due-blue)',
                  marginBottom: 6,
                }}
              >
                Đăng nhập tài khoản
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Nhập tên đăng nhập và mật khẩu được cấp để truy cập vào hệ thống:
              </p>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-danger-light)',
                  border: '1px solid #fecaca',
                  color: 'var(--color-danger)',
                  fontSize: '0.8125rem',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Info size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Actual Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label
                  htmlFor="login-username"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: 6,
                    color: 'var(--color-text)',
                  }}
                >
                  Tên đăng nhập / Email
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User
                    size={17}
                    style={{
                      position: 'absolute',
                      left: 12,
                      color: 'var(--color-text-secondary)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    id="login-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="VD: nmanh hoặc tqhuy"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-due-blue)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: 6,
                    color: 'var(--color-text)',
                  }}
                >
                  Mật khẩu
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock
                    size={17}
                    style={{
                      position: 'absolute',
                      left: 12,
                      color: 'var(--color-text-secondary)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 38px',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-due-blue)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8125rem',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <span style={{ color: 'var(--color-due-blue)', cursor: 'pointer' }}>
                  Quên mật khẩu?
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: '11px',
                  backgroundColor: 'var(--color-due-blue)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background-color 0.2s',
                  boxShadow: '0 2px 6px rgba(0, 84, 166, 0.3)',
                }}
                onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-due-blue-hover)')}
                onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-due-blue)')}
              >
                <LogIn size={17} />
                <span>{loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP HỆ THỐNG'}</span>
              </button>
            </form>

            {/* Quick Demo Credentials Box */}
            <div
              style={{
                marginTop: 28,
                padding: '14px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-due-blue)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Danh sách tài khoản demo
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>
                  Mật khẩu chung: <strong>{DEMO_PASSWORD}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {users.map((u) => {
                  const isCurrent = username === u.username;

                  return (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        backgroundColor: isCurrent ? 'var(--color-due-blue-light)' : '#ffffff',
                        border: `1px solid ${isCurrent ? '#b8d9f5' : 'var(--color-border-light)'}`,
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: 'var(--color-text)',
                          }}
                        >
                          {u.userTypeLabel || u.roleTitle || ROLE_LABELS[u.role]}:
                        </span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          <strong>{u.username}</strong> ({u.name})
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleSelectDemoAccount(u, false)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 3,
                            border: '1px solid var(--color-border)',
                            backgroundColor: '#ffffff',
                            color: 'var(--color-due-blue)',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Điền tên đăng nhập & mật khẩu vào form"
                        >
                          Điền
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectDemoAccount(u, true)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 3,
                            border: 'none',
                            backgroundColor: 'var(--color-due-blue)',
                            color: '#ffffff',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Đăng nhập ngay vào hệ thống với vai trò này"
                        >
                          Vào ngay
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Footer matching Image 2 */}
      <Footer />
    </div>
  );
}
