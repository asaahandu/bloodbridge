import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCEPTED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_DOCUMENT_COUNT = 5;
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 10 * 1024 * 1024;

type KycRequestModalProps = {
  initialHospitalName: string;
  onClose: () => void;
  onSubmit: (
    hospitalName: string,
    documents: DocumentPicker.DocumentPickerAsset[],
  ) => Promise<void>;
  visible: boolean;
};

function formatFileSize(size?: number) {
  if (size == null) return 'Size unavailable';
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function KycRequestModal({
  initialHospitalName,
  onClose,
  onSubmit,
  visible,
}: KycRequestModalProps) {
  const [hospitalName, setHospitalName] = useState(initialHospitalName);
  const [documents, setDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setHospitalName(initialHospitalName);
    setDocuments([]);
    setError('');
  }, [initialHospitalName, visible]);

  const chooseDocuments = async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_DOCUMENT_TYPES,
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const nextDocuments = [...documents, ...result.assets];
      if (nextDocuments.length > MAX_DOCUMENT_COUNT) {
        setError('Attach no more than five documents.');
        return;
      }
      if (nextDocuments.some((document) => (document.size ?? 0) > MAX_DOCUMENT_SIZE)) {
        setError('Each document must be 5 MB or smaller.');
        return;
      }
      if (nextDocuments.reduce((total, document) => total + (document.size ?? 0), 0) > MAX_TOTAL_SIZE) {
        setError('Documents must total 10 MB or less.');
        return;
      }

      setDocuments(nextDocuments);
    } catch {
      setError('Unable to open the document picker. Please try again.');
    }
  };

  const submitRequest = async () => {
    const trimmedHospitalName = hospitalName.trim();
    if (!trimmedHospitalName) {
      setError('Enter the hospital name.');
      return;
    }
    if (documents.length === 0) {
      setError('Attach at least one supporting document.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit(trimmedHospitalName, documents);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit the verification request.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <SafeAreaView className="flex-1 justify-end bg-black/50" edges={['top', 'bottom']}>
        <View className="max-h-[92%] overflow-hidden rounded-t-[28px] bg-canvas">
          <View className="flex-row items-start justify-between px-5 pb-4 pt-5">
            <View className="flex-1 pr-4">
              <Text className="text-[10px] font-extrabold tracking-[1.2px] text-blood-red">
                HOSPITAL KYC
              </Text>
              <Text className="mt-1 text-[23px] font-bold text-ink">Request verification</Text>
              <Text className="mt-1 text-[11px] leading-[17px] text-muted">
                Submit your official hospital name and supporting documents for review.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close verification request"
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card active:opacity-70"
              disabled={submitting}
              onPress={onClose}>
              <Ionicons color="#121212" name="close" size={21} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerClassName="gap-5 px-5 pb-7"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View>
              <Text className="mb-2 text-xs font-bold text-ink">Hospital name</Text>
              <TextInput
                accessibilityLabel="Hospital name for verification"
                autoCapitalize="words"
                className="h-12 rounded-[13px] border border-line bg-card px-3.5 text-sm text-ink"
                editable={!submitting}
                maxLength={160}
                onChangeText={setHospitalName}
                placeholder="Enter the registered hospital name"
                placeholderTextColor="#8B8B88"
                value={hospitalName}
              />
            </View>

            <View>
              <View className="mb-2 flex-row items-end justify-between gap-3">
                <Text className="text-xs font-bold text-ink">Documents</Text>
                <Text className="text-[10px] text-muted">PDF, JPEG, PNG · up to 5 files</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                className="flex-row items-center gap-3 rounded-[15px] border border-dashed border-[#D8B7BA] bg-blood-red-soft px-4 py-4 active:opacity-70"
                disabled={submitting || documents.length >= MAX_DOCUMENT_COUNT}
                onPress={chooseDocuments}>
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <Ionicons color="#8E1722" name="cloud-upload-outline" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-ink">Choose documents</Text>
                  <Text className="mt-1 text-[10px] text-muted">5 MB each · 10 MB total</Text>
                </View>
                <Ionicons color="#8E1722" name="add" size={21} />
              </Pressable>

              {documents.map((document) => (
                <View
                  className="mt-2 flex-row items-center gap-3 rounded-[13px] border border-line bg-card px-3 py-3"
                  key={document.uri}>
                  <Ionicons
                    color="#5F5F5C"
                    name={document.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'}
                    size={18}
                  />
                  <View className="flex-1">
                    <Text className="text-[11px] font-semibold text-ink" numberOfLines={1}>
                      {document.name}
                    </Text>
                    <Text className="mt-0.5 text-[9px] text-muted">
                      {formatFileSize(document.size)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Remove ${document.name}`}
                    accessibilityRole="button"
                    className="h-9 w-9 items-center justify-center rounded-xl active:bg-[#F1F1EF]"
                    disabled={submitting}
                    onPress={() => setDocuments((current) => current.filter((item) => item.uri !== document.uri))}>
                    <Ionicons color="#737373" name="close-circle-outline" size={19} />
                  </Pressable>
                </View>
              ))}
            </View>

            {error ? (
              <Text accessibilityLiveRegion="assertive" className="text-xs font-semibold text-error">
                {error}
              </Text>
            ) : null}

            <View className="flex-row gap-2.5">
              <Pressable
                accessibilityRole="button"
                className="h-12 flex-1 items-center justify-center rounded-[14px] border border-line bg-card active:opacity-70 disabled:opacity-50"
                disabled={submitting}
                onPress={onClose}>
                <Text className="text-xs font-bold text-ink">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className="h-12 flex-[1.4] flex-row items-center justify-center gap-2 rounded-[14px] bg-blood-red active:bg-blood-red-dark disabled:opacity-50"
                disabled={submitting || !hospitalName.trim() || documents.length === 0}
                onPress={submitRequest}>
                {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text className="text-xs font-extrabold text-white">
                  {submitting ? 'Submitting...' : 'Submit for review'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}