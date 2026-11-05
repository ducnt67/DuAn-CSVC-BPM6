import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, Send, Search, Trash2 } from 'lucide-react';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { ROLES } from '../../../dung-chung/hang-so/roles';
import { askAssistant } from '../../../ha-tang/api/aiService';
import './AiAssistant.css';

const SUGGESTIONS = {
  [ROLES.FACILITY_ADMIN]: [
    'Những việc khẩn nào đang mở?',
    'Thiết bị nào hỏng lặp lại nhiều nhất 6 tháng qua?',
    'Cán bộ kỹ thuật nào đang nhiều việc nhất?',
    'Chi phí sửa điều hòa trung bình là bao nhiêu?',
  ],
  [ROLES.DIRECTOR]: [
    'Có bao nhiêu phương án đang chờ duyệt, tổng kinh phí bao nhiêu?',
    'Nhà thầu nào từng nghiệm thu không đạt hoặc trễ hạn?',
    'Tóm tắt tình hình sửa chữa 30 ngày qua',
    'Khu nhà nào phát sinh nhiều sự cố nhất?',
  ],
  [ROLES.STAFF]: ['Tôi đang có những việc nào?', 'Việc nào của tôi khẩn nhất?'],
  [ROLES.PROCUREMENT]: ['Các công việc thuê ngoài đang thực hiện?', 'Nhà thầu nào hay trễ hạn?'],
  [ROLES.REQUESTER]: ['Yêu cầu của tôi đang đến bước nào?', 'Yêu cầu nào của tôi chưa hoàn thành?'],
};

function renderInline(text, keyPrefix) {
  const tokens = text.split(/(\*\*[^*]+\*\*|YC-\d{4}\w?)/g).filter(Boolean);
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>;
    if (/^YC-\d{4}\w?$/.test(token)) return <Link key={key} to={`/requests/${token}`}>{token}</Link>;
    return <Fragment key={key}>{token}</Fragment>;
  });
}

function Answer({ text }) {
  return text.split('\n').map((line, index) => {
    const bullet = /^\s*([*-]|\d+\.)\s+/.exec(line);
    const content = bullet ? line.slice(bullet[0].length) : line;
    return (
      <div key={index} style={bullet ? { paddingLeft: 12 } : undefined}>
        {bullet ? (bullet[1].endsWith('.') ? `${bullet[1]} ` : '• ') : null}
        {renderInline(content, index)}
      </div>
    );
  });
}

export default function AiChatWidget() {
  const { currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, open]);

  useEffect(() => {
    setMessages([]);
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setSending(true);
    try {
      const result = await askAssistant(question, history);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.output?.answer || 'Không có câu trả lời.', trace: result.toolTrace, source: result.source },
      ]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Lỗi: ${error.message}`, trace: [] }]);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="ai-fab" onClick={() => setOpen(true)} aria-label="Mở Trợ lý AI">
        <Sparkles size={18} /> <span>Hỏi Trợ lý AI</span>
      </button>
    );
  }

  return (
    <div className="ai-chat" role="dialog" aria-label="Trợ lý AI">
      <div className="ai-chat__head">
        <Sparkles size={18} />
        <div>
          <strong>Trợ lý AI CSVC</strong>
          <span>Tra cứu dữ liệu thật theo quyền của bạn</span>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={() => setMessages([])} aria-label="Xóa hội thoại" title="Xóa hội thoại"><Trash2 size={15} /></button>
        )}
        <button type="button" onClick={() => setOpen(false)} aria-label="Đóng"><X size={16} /></button>
      </div>
      <div className="ai-chat__body" ref={bodyRef}>
        {messages.length === 0 && (
          <>
            <div className="ai-msg ai-msg--assistant">
              Xin chào {currentUser.name}! Mình có thể tra cứu yêu cầu, thống kê, chi phí, cán bộ và nhà thầu để trả lời bạn. Thử một câu hỏi:
            </div>
            <div className="ai-suggest-list">
              {(SUGGESTIONS[currentUser.role] || []).map((q) => (
                <button key={q} type="button" onClick={() => send(q)}>{q}</button>
              ))}
            </div>
          </>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`ai-msg ai-msg--${message.role}`}>
            {message.role === 'assistant' ? <Answer text={message.content} /> : message.content}
            {message.trace?.length > 0 && (
              <div className="ai-msg__trace">
                {message.trace.map((step, i) => (
                  <span key={i} className={`ai-chip ai-chip--${step.by}`} title={step.summary}><Search size={10} /> {step.label}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="ai-msg ai-msg--assistant"><span className="ai-typing"><i /><i /><i /></span> Agent đang tra cứu dữ liệu…</div>
        )}
      </div>
      <form
        className="ai-chat__form"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <textarea
          rows={1}
          value={input}
          maxLength={1000}
          placeholder="Hỏi về yêu cầu, chi phí, cán bộ, nhà thầu…"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <button type="submit" disabled={!input.trim() || sending} aria-label="Gửi"><Send size={16} /></button>
      </form>
    </div>
  );
}
