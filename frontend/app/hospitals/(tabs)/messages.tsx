import { MessagesScreen } from '@/components/messages/MessagesScreen';
import { useLocalSearchParams } from 'expo-router';

export default function HospitalMessagesScreen() {
  const { donorId, requestId, donorName, requestReference } = useLocalSearchParams<{
    donorId?: string;
    requestId?: string;
    donorName?: string;
    requestReference?: string;
  }>();
  return (
    <MessagesScreen
      audience="hospital"
      donorId={donorId}
      donorName={donorName}
      requestId={requestId}
      requestReference={requestReference}
    />
  );
}