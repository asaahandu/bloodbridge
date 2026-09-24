import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import type { AiChatAudience } from '@/components/ai-chat';
import {
  answerAiEligibilityScreening,
  sendAiChatMessage,
  startAiEligibilityScreening,
  type AiChatMessage as ApiChatMessage,
  type AiEligibilityScreening,
} from '@/lib/api';
import { getAuthenticatedUser } from '@/lib/auth-session';

type ChatMessage = ApiChatMessage & {
  id: string;
  isWelcome?: boolean;
};

const audienceContent: Record<
  AiChatAudience,
  { description: string; fallbackRoute: '/donors' | '/hospitals'; suggestions: string[] }
> = {
  donor: {
    description:
      'I can help you understand BloodBridge requests and prepare questions for the hospital team.',
    fallbackRoute: '/donors',
    suggestions: ['Explain a request', 'Review my availability', 'Prepare hospital questions'],
  },
  hospital: {
    description:
      'I can help turn operational notes into clear blood-request drafts for staff review.',
    fallbackRoute: '/hospitals',
    suggestions: ['Draft a blood request', 'Summarize an active request', 'Prepare donor outreach'],
  },
};

function createWelcomeMessage(audience: AiChatAudience): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    isWelcome: true,
    content: `Hello, I'm your BloodBridge assistant. ${audienceContent[audience].description}`,
  };
}

export default function AiChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const screeningStartedRef = useRef(false);
  const {
    audience: audienceParam,
    mode,
    requestId,
  } = useLocalSearchParams<{ audience?: string; mode?: string; requestId?: string }>();
  const audience: AiChatAudience = audienceParam === 'donor' ? 'donor' : 'hospital';
  const content = audienceContent[audience];
  const isEligibilityScreening =
    audience === 'donor' && mode === 'eligibility' && Boolean(requestId);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    isEligibilityScreening ? [] : [createWelcomeMessage(audience)],
  );
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isStarting, setIsStarting] = useState(isEligibilityScreening);
  const [startAttempt, setStartAttempt] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [screeningStatus, setScreeningStatus] = useState<'in_progress' | 'completed'>(
    'in_progress',
  );
  const [answerSummary, setAnswerSummary] = useState('');
  const [reviewFlags, setReviewFlags] = useState<string[]>([]);

  const applyScreening = (screening: AiEligibilityScreening) => {
    setMessages(
      screening.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      })),
    );
    setScreeningStatus(screening.status);
    setAnswerSummary(screening.answerSummary);
    setReviewFlags(screening.reviewFlags);
  };

  useEffect(() => {
    if (!isEligibilityScreening || !requestId || screeningStartedRef.current) return;
    screeningStartedRef.current = true;

    const startScreening = async () => {
      setIsStarting(true);
      setErrorMessage('');
      try {
        const session = await getAuthenticatedUser();
        if (!session || session.role !== 'donor') {
          throw new Error('Please sign in again as a donor to complete screening.');
        }
        applyScreening(await startAiEligibilityScreening(session.authToken, requestId));
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Eligibility screening could not start.',
        );
      } finally {
        setIsStarting(false);
      }
    };

    void startScreening();
  }, [isEligibilityScreening, requestId, startAttempt]);

  const retryScreeningStart = () => {
    screeningStartedRef.current = false;
    setStartAttempt((current) => current + 1);
  };

  const closeChat = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(content.fallbackRoute);
  };

  const sendMessage = async (value = draft) => {
    const contentToSend = value.trim();
    if (!contentToSend || isSending || isStarting || screeningStatus === 'completed') return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: contentToSend,
    };
    const pendingMessages = [...messages, userMessage];

    setMessages(pendingMessages);
    setDraft('');
    setErrorMessage('');
    setIsSending(true);

    try {
      const session = await getAuthenticatedUser();
      if (!session) throw new Error('Please sign in again to use BloodBridge AI.');

      if (isEligibilityScreening && requestId) {
        if (session.role !== 'donor') throw new Error('Please sign in again as a donor.');
        applyScreening(
          await answerAiEligibilityScreening(session.authToken, requestId, contentToSend),
        );
      } else {
        const history = pendingMessages
          .filter((message) => !message.isWelcome)
          .slice(-12)
          .map(({ role, content: messageContent }) => ({ role, content: messageContent }));
        const reply = await sendAiChatMessage(session.authToken, history);

        setMessages((current) => [
          ...current,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: reply.message,
          },
        ]);
      }
    } catch (error) {
      setMessages(messages);
      setDraft(contentToSend);
      setErrorMessage(error instanceof Error ? error.message : 'AI chat could not respond.');
    } finally {
      setIsSending(false);
    }
  };

  const canSend =
    Boolean(draft.trim()) && !isSending && !isStarting && screeningStatus !== 'completed';

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <View className="flex-row items-center border-b border-line bg-card px-5 py-3.5">
          <Pressable
            accessibilityLabel="Close AI assistant"
            className="h-11 w-11 items-center justify-center rounded-2xl border border-line bg-field active:opacity-70"
            onPress={closeChat}>
            <Ionicons color="#121212" name="arrow-back" size={22} />
          </Pressable>

          <View className="ml-3 h-11 w-11 items-center justify-center rounded-2xl bg-ink">
            <Ionicons color="#FFFFFF" name="sparkles" size={21} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[16px] font-extrabold text-ink">
              {isEligibilityScreening ? 'Eligibility screening' : 'BloodBridge AI'}
            </Text>
            <Text className="mt-0.5 text-[10px] font-bold text-muted">
              {isEligibilityScreening
                ? 'PRIVATE PRE-SCREENING'
                : audience === 'donor'
                  ? 'DONOR ASSISTANT'
                  : 'HOSPITAL ASSISTANT'}
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="grow px-5 pb-6 pt-5"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}>
          {isEligibilityScreening ? (
            <View className="mb-5 rounded-[18px] border border-[#E8D2D4] bg-[#FBEDEE] px-4 py-3.5">
              <View className="flex-row items-center">
                <Ionicons color="#8E1722" name="shield-checkmark-outline" size={18} />
                <Text className="ml-2 text-[12px] font-extrabold text-accent">
                  Initial screening only
                </Text>
              </View>
              <Text className="mt-2 text-[11px] font-medium leading-[17px] text-[#6D4B4E]">
                Answer one question at a time. The AI will summarize your answers for clinical
                staff, who make the final eligibility decision in person.
              </Text>
            </View>
          ) : null}

          {isStarting ? (
            <View className="mb-4 flex-row items-center rounded-[18px] border border-line bg-card px-4 py-4">
              <ActivityIndicator color="#8E1722" size="small" />
              <Text className="ml-3 text-[12px] font-semibold text-muted">
                Preparing your screening...
              </Text>
            </View>
          ) : null}

          {messages.map((message) =>
            message.role === 'assistant' ? (
              <View className="mb-4 flex-row items-end" key={message.id}>
                <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-xl bg-ink">
                  <Ionicons color="#FFFFFF" name="sparkles" size={15} />
                </View>
                <View className="max-w-[84%] rounded-[20px] rounded-bl-md border border-line bg-card px-4 py-3.5">
                  <Text className="text-[13px] font-semibold leading-[19px] text-ink">
                    {message.content}
                  </Text>
                  {message.isWelcome && !isEligibilityScreening ? (
                    <Text className="mt-2 text-[11px] leading-[17px] text-muted">
                      I won&apos;t make medical, donor-eligibility, or emergency-care decisions. Always
                      review important information with qualified staff.
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <View className="mb-4 items-end" key={message.id}>
                <View className="max-w-[84%] rounded-[20px] rounded-br-md bg-ink px-4 py-3.5">
                  <Text className="text-[13px] font-semibold leading-[19px] text-white">
                    {message.content}
                  </Text>
                </View>
              </View>
            ),
          )}

          {!isEligibilityScreening && messages.length === 1 ? (
            <View className="mt-4">
              <Text className="text-[10px] font-extrabold tracking-[1.3px] text-muted">
                SUGGESTED STARTERS
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {content.suggestions.map((suggestion) => (
                  <Pressable
                    accessibilityRole="button"
                    className="flex-row items-center rounded-full border border-line bg-card px-3.5 py-2.5 active:opacity-70"
                    disabled={isSending}
                    key={suggestion}
                    onPress={() => void sendMessage(suggestion)}>
                    <Ionicons color="#8E1722" name="sparkles-outline" size={14} />
                    <Text className="ml-2 text-[11px] font-bold text-ink">{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {isSending ? (
            <View className="mb-4 flex-row items-center pl-10">
              <ActivityIndicator color="#8E1722" size="small" />
              <Text className="ml-2 text-[11px] font-semibold text-muted">Thinking...</Text>
            </View>
          ) : null}

          {isEligibilityScreening && screeningStatus === 'completed' ? (
            <View className="mb-5 rounded-[20px] border border-[#BEDBCF] bg-success-soft p-4">
              <View className="flex-row items-center">
                <Ionicons color="#1F6A4C" name="checkmark-circle" size={20} />
                <Text className="ml-2 text-[13px] font-extrabold text-success">
                  Answers saved for staff review
                </Text>
              </View>
              {answerSummary ? (
                <Text className="mt-3 text-[12px] font-medium leading-[18px] text-ink">
                  {answerSummary}
                </Text>
              ) : null}
              {reviewFlags.length ? (
                <View className="mt-3 border-t border-[#BEDBCF] pt-3">
                  <Text className="text-[10px] font-extrabold tracking-[1px] text-success">
                    ITEMS FOR CLINICAL REVIEW
                  </Text>
                  {reviewFlags.map((flag) => (
                    <View className="mt-2 flex-row items-start" key={flag}>
                      <View className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-success" />
                      <Text className="flex-1 text-[11px] font-medium leading-[17px] text-ink">
                        {flag}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <View className="flex-1" />
        </ScrollView>

        <View className="border-t border-line bg-card px-5 pb-3 pt-3">
          {errorMessage ? (
            <View className="mb-2 flex-row items-start rounded-xl bg-[#FBEDEE] px-3 py-2.5">
              <Ionicons color="#8E1722" name="alert-circle-outline" size={16} />
              <View className="ml-2 flex-1">
                <Text className="text-[11px] font-semibold leading-[16px] text-accent">
                  {errorMessage}
                </Text>
                {isEligibilityScreening && messages.length === 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    className="mt-2 self-start active:opacity-70"
                    onPress={retryScreeningStart}>
                    <Text className="text-[10px] font-extrabold text-accent">TRY AGAIN</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {isEligibilityScreening && screeningStatus === 'completed' ? (
            <Pressable
              accessibilityRole="button"
              className="h-12 items-center justify-center rounded-[15px] bg-ink active:opacity-80"
              onPress={closeChat}>
              <Text className="text-[12px] font-extrabold text-white">Return to donor home</Text>
            </Pressable>
          ) : (
            <View className="flex-row items-end rounded-[19px] border border-line bg-field p-2">
              <TextInput
                accessibilityLabel={isEligibilityScreening ? 'Screening answer' : 'AI message'}
                className="max-h-28 min-h-[42px] flex-1 px-3 py-2.5 text-[13px] text-ink"
                editable={!isSending && !isStarting}
                maxLength={800}
                multiline
                onChangeText={setDraft}
                placeholder={isEligibilityScreening ? 'Type your answer' : 'Message BloodBridge AI'}
                placeholderTextColor="#8B8B88"
                value={draft}
              />
              <Pressable
                accessibilityLabel={isEligibilityScreening ? 'Send screening answer' : 'Send AI message'}
                accessibilityRole="button"
                className={`h-10 w-10 items-center justify-center rounded-[14px] ${canSend ? 'bg-accent active:opacity-75' : 'bg-[#D7D7D3]'}`}
                disabled={!canSend}
                onPress={() => void sendMessage()}>
                {isSending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons color="#FFFFFF" name="arrow-up" size={19} />
                )}
              </Pressable>
            </View>
          )}
          <Text className="mt-2 text-center text-[9px] font-medium text-muted">
            {isEligibilityScreening
              ? 'This does not replace the hospital\'s in-person donor assessment.'
              : 'AI responses may be inaccurate. Verify clinical and operational details.'}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
