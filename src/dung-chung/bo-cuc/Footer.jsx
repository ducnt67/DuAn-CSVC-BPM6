import { Phone, Mail, Building2, Facebook, Youtube, ExternalLink } from 'lucide-react';
import UniversityLogo from '../thanh-phan/UniversityLogo';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="due-site-footer">
      {/* Top Brand Orange Accent Stripe (Matching Image 2) */}
      <div className="footer-top-stripe" />

      {/* Main Footer Container */}
      <div className="footer-main-container">
        <div className="footer-grid">
          {/* Column 1: Brand Logo & Mission Statement */}
          <div className="footer-col footer-col-about">
            <UniversityLogo variant="white" size="md" />

            <p className="footer-mission-text">
              Chúng tôi tin tưởng rằng giáo dục đại học đóng vai trò then chốt trong{' '}
              <strong>“kiến tạo xã hội tương lai”</strong>. Chúng tôi theo đuổi tư tưởng giáo dục khai
              phóng, với tính nhân bản, tinh thần khoa học và sự chủ động học tập suốt đời của mỗi cá
              nhân, vì mục tiêu xây dựng một xã hội thịnh vượng và tiến bộ.
            </p>

            <a
              href="https://due.udn.vn/vi-vn/gioi-thieu/tam-nhin-su-mang"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-readmore-link"
            >
              Read More &raquo;
            </a>
          </div>

          {/* Column 2: Contact Info */}
          <div className="footer-col footer-col-contact">
            <h4 className="footer-heading">LIÊN HỆ</h4>
            <div className="footer-heading-underline" />

            <div className="footer-contact-dept">
              Trung tâm Số và Học Liệu, Trường Đại học Kinh tế, ĐH Đà Nẵng
            </div>

            <div className="footer-contact-list">
              <a href="tel:02363525656" className="footer-contact-row">
                <span className="footer-icon-box">
                  <Phone size={14} />
                </span>
                <span className="footer-contact-text">
                  Phone : <strong>(84.236) 3525656</strong>
                </span>
              </a>

              <a href="mailto:i.t.c@due.edu.vn" className="footer-contact-row">
                <span className="footer-icon-box">
                  <Mail size={14} />
                </span>
                <span className="footer-contact-text">
                  Email : <strong>i.t.c@due.edu.vn</strong>
                </span>
              </a>

              <div className="footer-contact-row">
                <span className="footer-icon-box">
                  <Building2 size={14} />
                </span>
                <span className="footer-contact-text">
                  Phòng CSVC : <strong>(84.236) 3522345</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Social & Portal Connections */}
          <div className="footer-col footer-col-social">
            <h4 className="footer-heading">KẾT NỐI</h4>
            <div className="footer-heading-underline" />

            <div className="footer-social-row">
              <a
                href="https://www.facebook.com/DUE.UDN"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                title="Facebook Trường Đại học Kinh tế - ĐHĐN"
                aria-label="Facebook DUE"
              >
                <Facebook size={20} />
              </a>

              <a
                href="https://www.youtube.com/c/DUEChannel"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                title="Kênh Youtube DUE"
                aria-label="Youtube DUE"
              >
                <Youtube size={20} />
              </a>
            </div>

            <div className="footer-quick-links">
              <a
                href="https://due.udn.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-portal-link"
              >
                <ExternalLink size={13} />
                <span>Cổng thông tin Trường ĐH Kinh tế</span>
              </a>
              <a
                href="https://estudy.due.edu.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-portal-link"
              >
                <ExternalLink size={13} />
                <span>Hệ thống DUE E-Study LMS</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Footer Bar */}
      <div className="footer-bottom-bar">
        <div className="footer-bottom-content">
          <span>
            &copy;Bản quyền <strong>Trường Đại học Kinh tế, Đại học Đà Nẵng</strong> | Phát triển bởi{' '}
            <strong>Trung tâm Số và Học Liệu</strong>.
          </span>
        </div>
      </div>
    </footer>
  );
}
