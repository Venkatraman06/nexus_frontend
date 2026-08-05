import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Users } from 'lucide-react';
import { get, post } from '@/services/api';
import { useToast } from '@/context/ToastContext';

interface ChatRoom {
  id: string;
  client: string;
  client_name: string;
  name: string;
  participants: { id: string; full_name: string; email: string }[];
  last_message: { text: string; sender_name: string | null; created_at: string } | null;
}

interface ChatMessage {
  id: string;
  room: string;
  sender: string | null;
  sender_name: string | null;
  text: string;
  created_at: string;
}

const ClientChatPanel: React.FC<{ onClose: () => void; currentUserId?: string }> = ({ onClose, currentUserId }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const { addToast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchRooms = async () => {
    try {
      const data = await get<any>('/client-chat-rooms/');
      setRooms(Array.isArray(data) ? data : (data.results ?? []));
    } catch {
      addToast('Could not load chats', 'error');
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const data = await get<any>('/client-chat-messages/', { room: roomId });
      setMessages(Array.isArray(data) ? data : (data.results ?? []));
    } catch {
      addToast('Could not load messages', 'error');
    }
  };

  useEffect(() => { fetchRooms(); }, []);
  useEffect(() => {
    if (activeRoom) fetchMessages(activeRoom.id);
  }, [activeRoom]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !activeRoom) return;
    try {
      await post('/client-chat-messages/', { room: activeRoom.id, text });
      setText('');
      fetchMessages(activeRoom.id);
    } catch {
      addToast('Failed to send message', 'error');
    }
  };

  return (
    <div style={{
  position: 'fixed', top: 0, right: 0, height: '100vh', width: '760px', maxWidth: '95vw',
  background: 'var(--color-surface, #ffffff)', boxShadow: '-8px 0 32px rgba(0,0,0,0.25)', zIndex: 9999,
  display: 'flex', flexDirection: 'row',
  isolation: 'isolate',
}}>
      {/* Room list */}
      <div style={{ width: '260px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '14px' }}>Project Chats</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rooms.length === 0 && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 1rem' }}>No client chats yet. Convert a lead with multiple assigned employees to start one.</p>}
          {rooms.map(room => (
            <div
              key={room.id}
              onClick={() => setActiveRoom(room)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                background: activeRoom?.id === room.id ? 'rgba(37,99,235,0.08)' : 'transparent',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <MessageCircle size={13} style={{ color: 'var(--color-secondary)' }} />
                <span style={{ fontWeight: 700, fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.client_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)', fontSize: '10.5px', marginBottom: '4px' }}>
                <Users size={11} /> {room.participants.length} member{room.participants.length !== 1 ? 's' : ''}
              </div>
              {room.last_message && (
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.last_message.sender_name ? `${room.last_message.sender_name}: ` : ''}{room.last_message.text}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!activeRoom ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Select a client chat to view the conversation.
          </div>
        ) : (
          <>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontWeight: 800, fontSize: '15px', display: 'block' }}>{activeRoom.client_name}</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {activeRoom.participants.map(p => p.full_name).join(', ')}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(msg => {
                const isMine = msg.sender === currentUserId;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                    {!isMine && <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-secondary)', marginBottom: '2px' }}>{msg.sender_name}</span>}
                    <div style={{
                      maxWidth: '70%', padding: '8px 12px', borderRadius: '12px', fontSize: '13px',
                      background: isMine ? 'linear-gradient(135deg,#2563EB,#7C3AED)' : 'var(--color-bg)',
                      color: isMine ? 'white' : 'var(--color-text-main)',
                    }}>
                      {msg.text}
                    </div>
                    <span style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type a message..."
                style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13px', outline: 'none' }}
              />
              <button onClick={handleSend} style={{ width: 40, height: 40, borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientChatPanel;