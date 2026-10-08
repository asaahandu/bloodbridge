import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io, type Socket } from 'socket.io-client';

import {
  getRealtimeBaseUrl,
  getUserSupportConversation,
  type SupportMessage,
} from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';

export function SupportChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const socketRef = useRef<Socket | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [userRole, setUserRole] = useState<'donor' | 'hospital'>('donor');
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadConversation = async () => {
      try {
        const session = await getAuthenticatedUser();
        if (!session) throw new Error('Please sign in again to contact support.');
        const conversation = await getUserSupportConversation(session.authToken);
        if (!mounted) return;
        setSessionToken(session.authToken);
        setUserRole(session.role);
        setConversationId(conversation.conversationId);
        setMessages(conversation.messages);
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load your support conversation.',
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadConversation();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionToken || !conversationId) return;
    let mounted = true;
    const socket = io(getRealtimeBaseUrl(), { auth: { token: sessionToken } });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit(
        'join-support-conversation',
        { conversationId },
        async (result: { ok: boolean; error?: string }) => {
          if (!mounted) return;
          if (!result.ok) {
            setError(result.error ?? 'Unable to join customer support.');
            return;
          }
          try {
            const conversation = await getUserSupportConversation(sessionToken);
            if (mounted) {
              setMessages((current) => {
                const knownIds = new Set(current.map((message) => message.id));
                return [
                  ...current,
                  ...conversation.messages.filter((message) => !knownIds.has(message.id)),
                ].sort((left, right) =>
                  new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
                );
              });
            }
          } catch (loadError) {
            if (mounted) {
              setError(
                loadError instanceof Error
                  ? loadError.message
                  : 'Unable to refresh your support conversation.',
              );
            }
          }
        },
      );
    });
    socket.on('support-message', (message: SupportMessage) => {
      if (!mounted || message.conversationId !== conversationId) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      );
    });
    socket.on('connect_error', (socketError) => {
      if (mounted) setError(socketError.message);
    });

    return () => {
      mounted = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, sessionToken]);

  const sendMessage = () => {
    const body = draft.trim();
    const socket = socketRef.current;
    if (!body || !socket?.connected || sending) return;

    setSending(true);
    setError('');
    socket.emit(
      'send-support-message',
      { body },
      (result: { ok: boolean; message?: SupportMessage; error?: string }) => {
        setSending(false);
        if (!result.ok) {
          setError(result.error ?? 'Message could not be sent.');
          return;
        }
        setDraft('');
        const sentMessage = result.message;
        if (sentMessage) {
          setMessages((current) =>
            current.some((item) => item.id === sentMessage.id)
              ? current
              : [...current, sentMessage],
          );
        }
      },
    );
  };

  const closeChat = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(userRole === 'donor' ? '/donors' : '/hospitals');
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <View className="flex-row items-center border-b border-line bg-card px-5 py-3.5">
          <Pressable
            accessibilityLabel="Close customer support"
            className="h-11 w-11 items-center justify-center rounded-2xl border border-line bg-field active:opacity-70"
            onPress={closeChat}>
            <Ionicons color="#121212" name="arrow-back" size={22} />
          </Pressable>
          <View className="ml-3 h-11 w-11 items-center justify-center rounded-2xl bg-ink">
            <Ionicons color="#FFFFFF" name="headset" size={21} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[16px] font-extrabold text-ink">Customer support</Text>
            <Text className="mt-0.5 text-[10px] font-bold text-muted">
              BLOODBRIDGE SUPPORT TEAM
            </Text>
          </View>
        </View>

        <View className="flex-1 px-5 pb-3">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#8E1722" />
            </View>
          ) : (
            <>
              <ScrollView
                ref={scrollViewRef}
                className="mt-4 flex-1"
                contentContainerClassName="gap-3 pb-4"
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}>
                {messages.length === 0 ? (
                  <View className="mt-8 items-center rounded-[21px] border border-line bg-card px-6 py-8">
                    <Ionicons color="#8E1722" name="chatbubble-ellipses-outline" size={28} />
                    <Text className="mt-3 text-sm font-bold text-ink">
                      How can we help?
                    </Text>
                    <Text className="mt-1 text-center text-[11px] leading-[17px] text-muted">
                      Send us a message and our support team will get back to you here.
                    </Text>
                  </View>
                ) : null}
                {messages.map((message) => {
                  const mine = message.senderRole === 'user';
                  return (
                    <View
                      className={`max-w-[84%] ${mine ? 'self-end' : 'self-start'}`}
                      key={message.id}>
                      {!mine ? (
                        <Text className="mb-1 ml-1 text-[9px] font-bold text-muted">
                          BloodBridge Support
                        </Text>
                      ) : null}
                      <View
                        className={`rounded-[18px] px-4 py-3 ${
                          mine
                            ? 'rounded-br-md bg-ink'
                            : 'rounded-bl-md border border-line bg-card'
                        }`}>
                        <Text
                          className={`text-[13px] leading-[19px] ${
                            mine ? 'text-white' : 'text-ink'
                          }`}>
                          {message.body}
                        </Text>
                      </View>
                      <Text className={`mt-1 text-[9px] text-muted ${mine ? 'text-right' : ''}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              {error ? (
                <Text className="mb-2 rounded-xl bg-error-soft px-3 py-2 text-[11px] font-bold text-error">
                  {error}
                </Text>
              ) : null}
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
                  accessibilityLabel="Send message to support"
                  className="h-10 w-10 items-center justify-center rounded-[14px] bg-blood-red active:opacity-75"
                  disabled={sending || !draft.trim()}
                  onPress={sendMessage}>
                  {sending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons color="#FFFFFF" name="arrow-up" size={19} />
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
