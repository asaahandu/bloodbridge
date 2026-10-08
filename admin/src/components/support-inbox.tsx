"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type SupportConversation = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: "donor" | "hospital";
  lastMessageBody: string;
  lastMessageAt: string;
};

type SupportMessage = {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderRole: "user" | "support";
  body: string;
  createdAt: string;
};

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: string | { message?: string };
  };
  if (!response.ok) {
    const message = typeof payload.error === "string"
      ? payload.error
      : payload.error?.message;
    throw new Error(message ?? "The request could not be completed.");
  }
  if (payload.data === undefined) throw new Error("The server returned an invalid response.");
  return payload.data;
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SupportInbox() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messagesConversationId, setMessagesConversationId] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const selectedConversation = conversations.find((item) => item.id === selectedId);

  const loadConversations = useCallback(async () => {
    const result = await getJson<SupportConversation[]>("/api/admin/support/conversations");
    setConversations(result);
    setSelectedId((current) =>
      result.some((conversation) => conversation.id === current)
        ? current
        : "",
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    void getJson<SupportConversation[]>("/api/admin/support/conversations")
      .then((result) => {
        if (!mounted) return;
        setConversations(result);
        setSelectedId("");
      })
      .catch((loadError: unknown) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load the inbox.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let mounted = true;
    void getJson<SupportMessage[]>(
      `/api/admin/support/conversations/${encodeURIComponent(selectedId)}/messages`,
    )
      .then((result) => {
        if (!mounted) return;
        setMessages(result);
        setMessagesConversationId(selectedId);
      })
      .catch((loadError: unknown) => {
        if (mounted) {
          setMessagesConversationId(selectedId);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this conversation.",
          );
        }
      });
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messagesConversationId, selectedId]);

  const visibleMessages = messagesConversationId === selectedId ? messages : [];
  const loadingMessages = Boolean(selectedId) && messagesConversationId !== selectedId;

  const refreshInbox = async () => {
    setError("");
    try {
      await Promise.all([
        loadConversations(),
        selectedId
          ? getJson<SupportMessage[]>(
              `/api/admin/support/conversations/${encodeURIComponent(selectedId)}/messages`,
            ).then((result) => {
              setMessages(result);
              setMessagesConversationId(selectedId);
            })
          : Promise.resolve(),
      ]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to refresh the inbox.");
    }
  };

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!selectedId || !body || sending) return;
    setSending(true);
    setError("");
    try {
      const message = await getJson<SupportMessage>(
        `/api/admin/support/conversations/${encodeURIComponent(selectedId)}/messages`,
        { method: "POST", body: JSON.stringify({ body }) },
      );
      setMessages((current) => [...current, message]);
      setDraft("");
      await loadConversations();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Reply could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      aria-label="Customer support inbox"
      className={`support-inbox ${selectedConversation ? "has-selection" : ""}`}>
      {!selectedConversation ? (
        <div aria-label="Support conversations" className="support-conversation-list">
          <div className="support-list-heading">
            <div>
              <h2>Your conversations</h2>
              <p>{conversations.length} customer threads</p>
            </div>
            <button
              aria-label="Refresh conversations"
              className="button secondary"
              disabled={loading}
              onClick={() => void refreshInbox()}
              type="button">
              Refresh
            </button>
          </div>
          {error ? <p className="support-error" role="alert">{error}</p> : null}
          {loading ? <p className="support-empty">Loading conversations…</p> : null}
          {!loading && conversations.length === 0 ? (
            <p className="support-empty">New customer conversations will appear here.</p>
          ) : null}
          {conversations.map((conversation) => (
            <button
              className="support-conversation"
              key={conversation.id}
              onClick={() => {
                setError("");
                setSelectedId(conversation.id);
              }}
              type="button">
              <span className="support-avatar" aria-hidden="true">
                {conversation.userName.slice(0, 1).toUpperCase()}
              </span>
              <span className="support-conversation-copy">
                <span className="support-conversation-top">
                  <strong>{conversation.userName}</strong>
                  <time dateTime={conversation.lastMessageAt}>
                    {formatMessageTime(conversation.lastMessageAt)}
                  </time>
                </span>
                <span className="support-user-detail">
                  {conversation.userRole} · {conversation.userEmail}
                </span>
                <span className="support-preview">
                  {conversation.lastMessageBody || "Conversation started"}
                </span>
              </span>
              <span aria-hidden="true" className="support-conversation-chevron">›</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="support-thread">
          <header className="support-thread-heading">
            <button
              aria-label="Back to conversations"
              className="button secondary support-back-button"
              onClick={() => {
                setError("");
                setSelectedId("");
              }}
              type="button">
              <span aria-hidden="true">‹</span>
              Conversations
            </button>
            <div>
              <h2>{selectedConversation.userName}</h2>
              <p>{selectedConversation.userRole} · {selectedConversation.userEmail}</p>
            </div>
            <span className="support-live-label">Support conversation</span>
          </header>
          {error ? <p className="support-error" role="alert">{error}</p> : null}
          <div aria-live="polite" className="support-message-list">
            {loadingMessages ? <p className="support-empty">Loading messages…</p> : null}
            {!loadingMessages && visibleMessages.length === 0 ? (
              <p className="support-empty">No messages in this conversation yet.</p>
            ) : null}
            {visibleMessages.map((message) => (
              <article
                className={`support-message ${message.senderRole === "support" ? "from-support" : "from-user"}`}
                key={message.id}>
                <span>{message.senderRole === "support" ? "BloodBridge Support" : selectedConversation.userName}</span>
                <p>{message.body}</p>
                <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form className="support-reply-form" onSubmit={(event) => void sendReply(event)}>
            <textarea
              aria-label="Write a support reply"
              maxLength={2_000}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a reply…"
              rows={2}
              value={draft}
            />
            <button className="button primary" disabled={sending || !draft.trim()} type="submit">
              {sending ? "Sending…" : "Send reply"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
