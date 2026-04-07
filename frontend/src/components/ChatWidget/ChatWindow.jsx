import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ChatWidget.css';
import { useAuth } from '../../context/AuthContext';
const API_BASE = process.env.REACT_APP_API_URL.replace('/api/v1', '');

const formatTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (err) {
    return '';
  }
};

const TypingIndicator = () => (
  <span className="typing-indicator">
    <span className="dot" />
    <span className="dot" />
    <span className="dot" />
  </span>
);

const PREDEFINED_ISSUES = [
    { id: 'auth-login-fails', title: 'Login fails', text: 'Login fails', solution: 'User steps:\n1) Verify username/email and password (check Caps Lock).\n2) Clear browser cache & cookies or try Incognito.\n3) Use the "Forgot password" flow to reset credentials.\n\nDeveloper steps:\n1) Inspect auth logs for failed attempts and error codes.\n2) Verify hashing and user lookup logic.\n3) Check rate limiting and account lockout policies.' },
    { id: 'auth-random-logout', title: 'Random logout', text: 'Random logout', solution: 'User steps:\n1) Close and reopen the browser, then re-login.\n2) Try a different browser or device.\n\nDeveloper steps:\n1) Check token expiry/refresh flows and clock skew on server.\n2) Confirm cookies (HttpOnly/secure) and storage strategy.\n3) Investigate concurrent session invalidation logic.' },
    { id: 'auth-session-expired', title: 'Session expired', text: 'Session expired', solution: 'User steps:\n1) Re-login and enable "Remember me" if available.\n2) Check system clock and timezone.\n\nDeveloper steps:\n1) Verify refresh token handling and expiry values.\n2) Ensure tokens are renewed before expiry during active sessions.' },
    { id: 'auth-token-issues', title: 'Token issues', text: 'Token invalid/expired/refresh problems', solution: 'User steps:\n1) Log out and log back in to obtain fresh tokens.\n\nDeveloper steps:\n1) Validate JWT signing/verification keys and rotation.\n2) Add detailed logs around token validation errors.\n3) Ensure client uses the refresh flow correctly.' },

    { id: 'apply-button-not-working', title: 'Apply button not working', text: 'Apply button not working', solution: 'User steps:\n1) Make sure you are logged in.\n2) Check required profile fields (resume, contact).\n3) Try another browser or clear cache.\n\nDeveloper steps:\n1) Inspect client console for JS errors and button handler wiring.\n2) Confirm API endpoint and auth headers are correct.\n3) Add server-side validation and return helpful errors.' },
    { id: 'resume-upload-failed', title: 'Resume upload failed', text: 'Resume upload failed', solution: 'User steps:\n1) Use supported file types (PDF/DOCX) and reduce file size.\n2) Retry and check network connectivity.\n\nDeveloper steps:\n1) Verify multipart handling (FormData + multer) and storage permissions.\n2) Check file size limits and return friendly errors for too-large files.' },
    { id: 'application-not-saved', title: 'Application not saved', text: 'Application not saved after submit', solution: 'User steps:\n1) Confirm you received a success message or email.\n2) Try re-submitting and note any error shown.\n\nDeveloper steps:\n1) Check API response and server logs for DB write errors.\n2) Ensure transactions are used where multiple writes are required.' },
    { id: 'already-applied-not-visible', title: 'Already applied but not visible', text: 'Application submitted but not visible in my applications', solution: 'User steps:\n1) Refresh the My Applications page and clear cache.\n2) Check your email for confirmation.\n\nDeveloper steps:\n1) Verify application record creation and user-job relation.\n2) Ensure the frontend fetches the correct endpoint and handles pagination.' },

    { id: 'messages-not-sending', title: 'Messages not sending', text: 'Messages not sending', solution: 'User steps:\n1) Ensure you are logged in and have network access.\n2) Reload the page and try again.\n\nDeveloper steps:\n1) Check the message POST endpoint and auth headers.\n2) Inspect socket/server logs for errors and timeouts.' },
    { id: 'chat-not-opening', title: 'Chat not opening', text: 'Chat UI not opening or crashes', solution: 'User steps:\n1) Re-login and open the chat from Messages page.\n2) Try a different browser to reproduce.\n\nDeveloper steps:\n1) Add defensive checks for null conversation/job objects.\n2) Ensure route params are validated before rendering.' },
    { id: 'undefined-id-error', title: "'undefined id' error", text: "'undefined id' error", solution: 'User steps:\n1) Refresh the page.\n2) Report the URL and steps to reproduce.\n\nDeveloper steps:\n1) Validate incoming route params and DB ids before use.\n2) Add explicit error handling and fallback UI when id is missing.' },
    { id: 'socket-connection-failed', title: 'Socket connection failed', text: 'Socket connection failed / disconnected', solution: 'User steps:\n1) Check your internet and firewall settings.\n2) Reload the app and try again.\n\nDeveloper steps:\n1) Inspect Socket.IO server logs and CORS/upgrades (NGINX) config.\n2) Add reconnect logic and increase pingTimeout/pingInterval as needed.' },

    { id: 'api-not-responding', title: 'API not responding', text: 'API not responding / network errors', solution: 'User steps:\n1) Check network and try again later.\n2) If using a proxy, ensure it allows requests to api domain.\n\nDeveloper steps:\n1) Check API server health and logs.\n2) Verify load balancer and firewall rules.\n3) Add health checks and monitoring.' },
    { id: 'server-500-error', title: '500 server error', text: 'Internal server error (500)', solution: 'User steps:\n1) Try the action again later.\n2) Report the action and time to support.\n\nDeveloper steps:\n1) Inspect server logs and stack traces for the error.\n2) Add validation, input sanitization, and better error messages.' },
    { id: 'slow-loading', title: 'Slow loading', text: 'Slow page loads or API responses', solution: 'User steps:\n1) Test with another network and browser.\n2) Clear cache and retry.\n\nDeveloper steps:\n1) Profile API responses and DB queries.\n2) Add caching, pagination, and optimize queries.\n3) Use a CDN for static assets.' },

    { id: 'profile-not-updating', title: 'Profile not updating', text: 'Profile changes not saved', solution: 'User steps:\n1) Ensure all required fields are filled.\n2) Check for success message after saving.\n\nDeveloper steps:\n1) Verify API endpoint and request payload.\n2) Check validation errors and return them to the client.' },
    { id: 'image-upload-failed', title: 'Image upload failed', text: 'Profile image upload failed', solution: 'User steps:\n1) Use JPG/PNG and smaller images.\n2) Retry after network check.\n\nDeveloper steps:\n1) Validate storage config (Cloudinary/s3) and keys.\n2) Add server-side image validation and helpful error messages.' },
    { id: 'missing-required-fields', title: 'Missing required fields', text: 'Form submission fails due to missing fields', solution: 'User steps:\n1) Fill all required fields marked with *.\n2) Hover/inspect fields for inline validation messages.\n\nDeveloper steps:\n1) Ensure frontend enforces required fields and shows validation messages.\n2) Backend must validate and return structured errors.' },

    { id: '404-page-not-found', title: 'Page not found (404)', text: '404 Page not found', solution: 'User steps:\n1) Check the URL for typos.\n2) Use the site navigation or homepage link.\n\nDeveloper steps:\n1) Add friendly 404 page and logging for broken links.\n2) Verify route definitions and client-side routing.' },
    { id: 'wrong-redirects', title: 'Wrong redirects', text: 'Page redirects to wrong location', solution: 'User steps:\n1) Report the link and where it redirects.\n2) Use the site menu to reach intended page.\n\nDeveloper steps:\n1) Check router logic and server redirect rules.\n2) Verify auth guards do not incorrectly redirect users.' },
    { id: 'nav-button-not-working', title: 'Button not working', text: 'Navigation or action button not responding', solution: 'User steps:\n1) Refresh and retry the button.\n2) Try another browser or device.\n\nDeveloper steps:\n1) Inspect console for JS errors and event bindings.\n2) Ensure accessibility attributes (role/button) are correct.' },

    { id: 'language-not-changing', title: 'Language not changing', text: 'Language selection not applied', solution: 'User steps:\n1) Select the language and refresh the page.\n2) Clear cache if strings still show previous language.\n\nDeveloper steps:\n1) Verify i18n initialization and language store.\n2) Ensure translations are loaded and keys are correct.' },
    { id: 'mixed-language-ui', title: 'Mixed language UI', text: 'Some UI shows in the wrong language', solution: 'User steps:\n1) Refresh and check language preferences.\n2) Report the pages with mixed language.\n\nDeveloper steps:\n1) Ensure all UI strings use i18n keys and no hard-coded text remains.\n2) Check fallback locale behavior.' },
    { id: 'notifications-not-showing', title: 'Notifications not showing', text: 'Notifications missing or not appearing', solution: 'User steps:\n1) Check notification settings in profile.\n2) Refresh the page and check the Notifications page.\n\nDeveloper steps:\n1) Verify notification creation and delivery logic.\n2) Ensure sockets emit notification events or background jobs run properly.' },
    { id: 'wrong-unread-count', title: 'Wrong unread count', text: 'Unread notification count incorrect', solution: 'User steps:\n1) Open Notifications page to sync read status.\n2) Refresh to see updated counts.\n\nDeveloper steps:\n1) Verify read/unread marking endpoint and client updates.\n2) Ensure optimistic UI does not drift from server state.' }
  ];

const ChatWindow = ({ onClose, inline = false, visible = true, onNewMessage }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { id: 'welcome', sender: 'bot', text: `${t('chatWidget.greetingPrefix')} ${user?.name ? user.name.split(' ')[0] : t('chatWidget.there')} — ${t('chatWidget.greetingBody')}`, time: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      try {
        bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
      } catch (err) {
        bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    await sendMessageFromText(text);
  };

  const sendMessageFromText = async (text, replaceId = null) => {
    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text, time: new Date().toISOString() };
    if (!replaceId) setMessages((m) => [...m, userMsg]);
    setInput('');
    setIsTyping(true);

    // loading placeholder (will be replaced by one and only one reply)
    const loadingId = replaceId || `l-${Date.now()}`;
    if (!replaceId) setMessages((m) => [...m, { id: loadingId, sender: 'bot', type: 'loading', text: '', time: new Date().toISOString() }]);

    try {
      const res = await fetch(API_BASE + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, role: user?.role || 'guest' }),
      });

      if (!res.ok) throw new Error(t('chatWidget.aiServiceError'));
      const data = await res.json();
      const reply = (data && (data.reply || data.message)) || t('chatWidget.noReply');

      // replace loading placeholder with AI reply (single replacement)
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? { id: `b-${Date.now()}`, sender: 'bot', text: reply, time: new Date().toISOString(), type: 'bot' } : m)));

      // notify widget wrapper about new message (for unread badge) only when widget is closed
      if (onNewMessage && !visible) onNewMessage();
    } catch (err) {
      // Try a local predefined solution first (single replacement). If none matches, show a single error message.
      try {
        const lower = (text || '').toLowerCase();
        const match = PREDEFINED_ISSUES.find((it) => lower.includes(it.text.toLowerCase()) || lower.includes(it.title.toLowerCase()));
        if (match) {
          setMessages((prev) => prev.map((m) => (m.id === loadingId ? { id: `fb-${Date.now()}`, sender: 'bot', text: match.solution, time: new Date().toISOString(), type: 'bot' } : m)));
        } else {
          setMessages((prev) => prev.map((m) => (m.id === loadingId ? { id: `err-${Date.now()}`, sender: 'bot', type: 'error', text: t('chatWidget.aiUnavailable'), originalText: text, time: new Date().toISOString() } : m)));
        }
      } catch (silent) {
        setMessages((prev) => prev.map((m) => (m.id === loadingId ? { id: `err-${Date.now()}`, sender: 'bot', type: 'error', text: t('chatWidget.aiUnavailable'), originalText: text, time: new Date().toISOString() } : m)));
      }
    } finally {
      setIsTyping(false);
    }
  };

  // Clicking a chip should autofill input; quick-send icon will directly send it
  const sendPredefined = async (issue) => {
    if (!issue) return;
    setInput(issue.text || '');
    inputRef.current?.focus();
  };

  const quickSendPredefined = async (issue) => {
    if (!issue || isTyping) return;
    await sendMessageFromText(issue.text || '');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{ id: 'welcome', sender: 'bot', text: `${t('chatWidget.greetingPrefix')} ${user?.name ? user.name.split(' ')[0] : t('chatWidget.there')} — ${t('chatWidget.greetingBody')}`, time: new Date().toISOString() }]);
  };

  const retryMessage = async (msg) => {
    if (!msg || !msg.originalText) return;
    // replace error message with new loading placeholder and resend
    const loadingId = `rl-${Date.now()}`;
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { id: loadingId, sender: 'bot', type: 'loading', text: '', time: new Date().toISOString() } : m)));
    try {
      const res = await fetch(API_BASE + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg.originalText, role: user?.role || 'guest' }),
      });
      if (!res.ok) throw new Error(t('chatWidget.aiServiceError'));
      const data = await res.json();
      const reply = (data && (data.reply || data.message)) || t('chatWidget.noReply');
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? { id: `b-${Date.now()}`, sender: 'bot', text: reply, time: new Date().toISOString(), type: 'bot' } : m)));
      if (onNewMessage && !visible) onNewMessage();
    } catch (err) {
      try {
        const lower = (msg.originalText || '').toLowerCase();
        const match = PREDEFINED_ISSUES.find((it) => lower.includes(it.text.toLowerCase()) || lower.includes(it.title.toLowerCase()));
        if (match) {
          setMessages((prev) => prev.map((m) => (m.id === loadingId ? { id: `fb-${Date.now()}`, sender: 'bot', text: match.solution, time: new Date().toISOString(), type: 'bot' } : m)));
          if (onNewMessage && !visible) onNewMessage();
        } else {
          setMessages((prev) => prev.map((m) => (m.id === loadingId ? { id: `err-${Date.now()}`, sender: 'bot', type: 'error', text: t('chatWidget.aiUnavailable'), originalText: msg.originalText, time: new Date().toISOString() } : m)));
        }
      } catch (silent) {
        setMessages((prev) => prev.map((m) => (m.id === loadingId ? { id: `err-${Date.now()}`, sender: 'bot', type: 'error', text: t('chatWidget.aiUnavailable'), originalText: msg.originalText, time: new Date().toISOString() } : m)));
      }
    }
  };

  return (
    <div className={`chat-window ${inline ? 'chat-window--inline' : ''} ${visible ? 'visible' : 'hidden'}`} role="dialog" aria-label={t('chatWidget.ariaLabel')}>
      <div className="chat-header gradient">
        <div>
          <div className="chat-title">{t('chatWidget.title')}</div>
          <div className="chat-subtitle">{user ? `${user.name?.split(' ')[0] || t('chatWidget.user')} · ${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : t('common.guest')}` : t('common.guest')}</div>
        </div>
        <div className="chat-actions">
          <button className="chat-clear" title={t('chatWidget.clearChat')} onClick={clearChat}>{t('common.clear')}</button>
          <a href="/ai-chat" className="chat-open-page" title={t('chatWidget.openFullChat')}>{t('common.open')}</a>
          <button onClick={onClose} className="chat-close" aria-label={t('chatWidget.closeChat')}>×</button>
        </div>
      </div>

      <div className="chat-tabs">
        <div className="tab-headers">
          <button className={`tab ${activeTab === 'suggestions' ? 'active' : ''}`} onClick={() => setActiveTab('suggestions')}>{t('chatWidget.suggestions')}</button>
          <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>{t('chatWidget.allIssues')}</button>
        </div>

        <div className="tab-content">
          {activeTab === 'suggestions' && (
            <div className="chat-presets" aria-hidden={false}>
              {PREDEFINED_ISSUES.map((issue) => (
                <div key={issue.id} className="preset-chip-wrap">
                  <button className="preset-chip" onClick={() => sendPredefined(issue)}>
                    {issue.title}
                  </button>
                  <button className="preset-send" title={t('chatWidget.sendNow')} onClick={() => quickSendPredefined(issue)}>
                    ➤
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'all' && (
            <div className="all-issues-list" role="list">
              {PREDEFINED_ISSUES.map((issue) => (
                <div key={issue.id} className="all-issue-item" role="listitem">
                  <div className="issue-row">
                    <div className="issue-title">{issue.title}</div>
                    <div className="issue-actions">
                      <button className="issue-use" onClick={() => sendPredefined(issue)}>{t('chatWidget.use')}</button>
                      <button className="issue-send" onClick={() => quickSendPredefined(issue)}>{t('chatWidget.send')}</button>
                    </div>
                  </div>
                  <div className="issue-solution">{issue.solution}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.sender === 'bot' ? 'bot' : 'user'} ${m.type || ''}`}>
            <div className="chat-msg-text">
              {m.type === 'loading' ? <div className="bubble-loading"><div className="spinner"/></div> : m.text}
              {m.type === 'error' && (
                <div className="error-actions">
                  <button className="retry-btn" onClick={() => retryMessage(m)}>{t('chatWidget.retry')}</button>
                </div>
              )}
            </div>
            <div className="chat-msg-meta">
              <span className="chat-msg-time">{formatTime(m.time)}</span>
            </div>
          </div>
        ))}

        {isTyping && <div className="chat-msg bot typing"><div className="chat-msg-text"><TypingIndicator /></div></div>}
      </div>

      <div className="chat-input">
        <textarea
          ref={inputRef}
          placeholder={t('chatWidget.placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
        />
        <button className="chat-send" onClick={sendMessage} disabled={isTyping || !input.trim()} aria-disabled={isTyping || !input.trim()}>
          {/* send icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" fill="#fff" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
