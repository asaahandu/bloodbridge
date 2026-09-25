import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io, type Socket } from 'socket.io-client';

import {
    getRealtimeBaseUrl,
    listMessageConversations,
    listMessages,
    type AppMessage,
    type MessageConversation,
} from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';

type MessagesScreenProps = {
  audience: 'donor' | 'hospital';
  requestId?: string;
  donorId?: string;
  donorName?: string;
  requestReference?: string;
};

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatPreviewTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? formatMessageTime(value)
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function MessagesScreen({
  audience,
  requestId,
  donorId,
  donorName,
  requestReference,
}: MessagesScreenProps) {
  const socketRef = useRef<Socket | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [conversations, setConversations] = useState<MessageConversation[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>(requestId ?? '');
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectedConversation = conversations.find(
    (conversation) => conversation.requestId === selectedRequestId,
  );
  const activeDonorId = audience === 'hospital'
    ? selectedConversation?.donorId ?? donorId
    : undefined;
  const roomPersonName = audience === 'donor'
    ? selectedConversation?.hospitalName
    : selectedConversation?.donorName ?? donorName ?? 'Donor';
  const roomReference = selectedConversation?.internalReference ?? requestReference;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const session = await getAuthenticatedUser();
        if (!session || session.role !== audience) throw new Error('Please sign in again.');
        const result = await listMessageConversations(session.authToken);
        if (!mounted) return;
        setSessionToken(session.authToken);
        setConversations(result);
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [audience]);

  useEffect(() => {
    if (!sessionToken) return;
    const socket = io(getRealtimeBaseUrl(), { auth: { token: sessionToken } });
    socket.on('conversation-preview', (preview: MessageConversation) => {
      setConversations((current) => {
        const remaining = current.filter((conversation) => conversation.id !== preview.id);
        return [preview, ...remaining];
      });
    });
    return () => {
      socket.disconnect();
    };
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken || !selectedRequestId) return;
    let mounted = true;
    const socket = io(getRealtimeBaseUrl(), { auth: { token: sessionToken } });
    socketRef.current = socket;
    setMessages([]);
    setError('');

    const loadMessages = async () => {
      try {
        const result = await listMessages(sessionToken, selectedRequestId, activeDonorId);
        if (mounted) setMessages(result);
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load conversation.');
      }
    };

    socket.on('connect', () => {
      socket.emit(
        'join-conversation',
        { requestId: selectedRequestId, donorId: activeDonorId },
        (result: { ok: boolean; error?: string }) => {
          if (!result.ok && mounted) setError(result.error ?? 'Unable to join conversation.');
        },
      );
    });
    socket.on('message', (message: AppMessage) => {
      if (mounted && message.requestId === selectedRequestId) {
        setMessages((current) =>
          current.some((item) => item.id === message.id) ? current : [...current, message],
        );
      }
    });
    socket.on('connect_error', (socketError) => {
      if (mounted) setError(socketError.message);
    });
    void loadMessages();

    return () => {
      mounted = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeDonorId, selectedRequestId, sessionToken]);

  const sendMessage = () => {
    const body = draft.trim();
    if (!body || !selectedRequestId || !socketRef.current?.connected || sending) return;
    setSending(true);
    socketRef.current.emit(
      'send-message',
      { requestId: selectedRequestId, donorId: activeDonorId, body },
      (result: { ok: boolean; error?: string }) => {
        setSending(false);
        if (!result.ok) setError(result.error ?? 'Message could not be sent.');
        else setDraft('');
      },
    );
  };

  const openConversation = (conversation: MessageConversation) => {
    setSelectedRequestId(conversation.requestId);
  };

  const renderInbox = () => (
    <>
      <View className="mt-7 flex-row items-center justify-between">
        <Text className="text-[17px] font-bold text-ink">Your conversations</Text>
        <Text className="text-[10px] font-semibold text-muted">{conversations.length} thread{conversations.length === 1 ? '' : 's'}</Text>
      </View>
      {conversations.length === 0 ? (
        <View className="mt-3 items-center rounded-[21px] border border-line bg-card px-6 py-12">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blood-red-soft">
            <Ionicons color="#8E1722" name="chatbubbles-outline" size={28} />
          </View>
          <Text className="mt-4 text-sm font-bold text-ink">No conversations yet</Text>
          <Text className="mt-1 max-w-[280px] text-center text-[11px] leading-[17px] text-muted">
            {audience === 'donor'
              ? 'Accept a request to start messaging its hospital.'
              : 'Start a conversation from a confirmed donor profile.'}
          </Text>
        </View>
      ) : (
        <View className="mt-3 gap-2.5">
          {conversations.map((conversation) => (
            <Pressable
              className="flex-row items-center gap-3 rounded-[19px] border border-line bg-card p-4 active:opacity-75"
              key={conversation.id}
              onPress={() => openConversation(conversation)}>
              <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-blood-red-soft">
                <Ionicons color="#8E1722" name="person-outline" size={22} />
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-[13px] font-extrabold text-ink" numberOfLines={1}>
                    {audience === 'donor' ? conversation.hospitalName : conversation.donorName}
                  </Text>
                  <Text className="text-[9px] font-semibold text-muted">
                    {formatPreviewTime(conversation.lastMessageAt)}
                  </Text>
                </View>
                <Text className="mt-1 text-[10px] font-semibold text-blood-red" numberOfLines={1}>
                  {conversation.bloodType} · {conversation.internalReference}
                </Text>
                <Text className="mt-1 text-[11px] text-muted" numberOfLines={1}>
                  {conversation.lastMessageBody || 'Conversation started'}
                </Text>
              </View>
              <Ionicons color="#A3A3A0" name="chevron-forward" size={18} />
            </Pressable>
          ))}
        </View>
      )}
    </>
  );

  const renderRoom = () => (
    <View className="mt-5 flex-1">
      <View className="flex-row items-center border-b border-line pb-4">
        <Pressable
          accessibilityLabel="Back to conversations"
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-line bg-card active:opacity-70"
          hitSlop={8}
          onPress={() => setSelectedRequestId('')}>
          <Ionicons color="#121212" name="arrow-back" size={19} />
        </Pressable>
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-blood-red-soft">
          <Ionicons color="#8E1722" name="person-outline" size={19} />
        </View>
        <View className="ml-3 min-w-0 flex-1">
          <Text className="text-[15px] font-extrabold text-ink" numberOfLines={1}>{roomPersonName}</Text>
          <Text className="mt-0.5 text-[10px] font-semibold text-muted" numberOfLines={1}>
            {roomReference ? `Blood request · ${roomReference}` : 'Blood request conversation'}
          </Text>
        </View>
      </View>

      <ScrollView className="mt-4 flex-1" contentContainerClassName="gap-3 pb-4" showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View className="mt-8 items-center">
            <Ionicons color="#A3A3A0" name="chatbubble-ellipses-outline" size={25} />
            <Text className="mt-2 text-center text-xs text-muted">Start the conversation.</Text>
          </View>
        ) : null}
        {messages.map((message) => {
          const mine = message.senderRole === audience;
          return (
            <View className={`max-w-[84%] ${mine ? 'self-end' : 'self-start'}`} key={message.id}>
              <View className={`rounded-[18px] px-4 py-3 ${mine ? 'rounded-br-md bg-ink' : 'rounded-bl-md border border-line bg-card'}`}>
                <Text className={`text-[13px] leading-[19px] ${mine ? 'text-white' : 'text-ink'}`}>{message.body}</Text>
              </View>
              <Text className={`mt-1 text-[9px] text-muted ${mine ? 'text-right' : ''}`}>{formatMessageTime(message.createdAt)}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View className="flex-row items-end rounded-[19px] border border-line bg-field p-2">
        <TextInput
          className="max-h-24 min-h-[42px] flex-1 px-3 py-2.5 text-[13px] text-ink"
          editable={!sending}
          maxLength={2_000}
          multiline
          onChangeText={setDraft}
          placeholder="Write a message"
          placeholderTextColor="#8B8B88"
          value={draft}
        />
        <Pressable
          accessibilityLabel="Send message"
          className="h-10 w-10 items-center justify-center rounded-[14px] bg-blood-red active:opacity-75"
          disabled={sending || !draft.trim()}
          onPress={sendMessage}>
          {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons color="#FFFFFF" name="arrow-up" size={19} />}
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <View className="flex-1 px-5 pb-3 pt-5">
        <Text className="text-[11px] font-extrabold tracking-[1.4px] text-blood-red">BLOODBRIDGE</Text>
        <Text className="mt-1 text-[27px] font-bold tracking-[-0.6px] text-ink">Messages</Text>
        {!selectedRequestId ? (
          <Text className="mt-1 text-xs leading-[18px] text-muted">
            {audience === 'donor' ? 'Message hospitals about accepted requests.' : 'Message confirmed donors about active requests.'}
          </Text>
        ) : null}

        {loading ? (
          <View className="mt-8 items-center"><ActivityIndicator color="#8E1722" /></View>
        ) : error && conversations.length === 0 && !selectedRequestId ? (
          <View className="mt-8 rounded-[18px] bg-error-soft p-4"><Text className="text-xs font-bold text-error">{error}</Text></View>
        ) : selectedRequestId ? renderRoom() : (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>{renderInbox()}</ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
