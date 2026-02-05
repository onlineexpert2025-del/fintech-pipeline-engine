import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { setInteractingWithCamera } from '../lib/biometric';
import { extractFromReceiptText } from '../lib/receiptExtractor';
import { addReceipt, addTransaction, updateGoalSaved, getGoal } from '../lib/db';
import { CATEGORIES } from '../lib/theme';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extracted, setExtracted] = useState<{ store: string; amount: number; date: string } | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    setInteractingWithCamera(true);
    return () => setInteractingWithCamera(false);
  }, []);

  const capture = async () => {
    if (!cameraRef.current || !permission?.granted) {
      if (!permission?.granted) requestPermission();
      return;
    }

    try {
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!result?.uri) return;

      const timestamp = Date.now();
      const tempUri = `${FileSystem.cacheDirectory}receipt_${timestamp}.jpg`;
      await FileSystem.copyAsync({ from: result.uri, to: tempUri });

      const permanentUri = `${FileSystem.documentDirectory}receipts/receipt_${timestamp}.jpg`;
      const dir = `${FileSystem.documentDirectory}receipts`;
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      await FileSystem.copyAsync({ from: result.uri, to: permanentUri });

      setProcessing(true);

      const recognized = await TextRecognition.recognize(tempUri);
      const text = recognized.text || '';
      await FileSystem.deleteAsync(tempUri, { idempotent: true });

      const { total, date, store } = extractFromReceiptText(text);

      setPhoto(permanentUri);
      setExtracted({ store, amount: total, date });
      setProcessing(false);
    } catch (e) {
      setProcessing(false);
      setPhoto(null);
      Alert.alert('Error', 'Could not process receipt. Please try again.');
    }
  };

  const saveReceipt = () => {
    if (!extracted || !photo) return;

    const receiptId = addReceipt({
      image_uri: photo,
      store: extracted.store,
      amount: extracted.amount,
      date: extracted.date,
      extracted_text: null,
    });

    addTransaction({
      type: 'expense',
      amount: extracted.amount,
      category: 'Food & Drinks',
      date: extracted.date,
      receipt_id: receiptId,
      note: `From receipt: ${extracted.store}`,
    });

    const goal = getGoal();
    if (goal) {
      updateGoalSaved(goal.id, goal.saved - extracted.amount);
    }

    router.back();
  };

  const retake = () => {
    setPhoto(null);
    setExtracted(null);
    setProcessing(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required to scan receipts.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (photo && extracted) {
    return (
      <View style={styles.container}>
        <View style={styles.preview}>
          <Image source={{ uri: photo }} style={styles.image} resizeMode="contain" />
        </View>
        <View style={styles.extracted}>
          <View style={styles.row}>
            <Text style={styles.label}>Store</Text>
            <Text style={styles.value}>{extracted.store}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount</Text>
            <Text style={[styles.value, styles.amount]}>${extracted.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{extracted.date}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={retake}>
            <Text style={styles.btnSecondaryText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={saveReceipt}>
            <Text style={styles.btnText}>Save Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (processing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.text}>Processing receipt...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera}>
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Position receipt within frame</Text>
          <TouchableOpacity style={styles.captureBtn} onPress={capture}>
            <Text style={styles.captureBtnText}>Capture</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
  overlayText: { color: '#fff', fontSize: 16, marginBottom: 20 },
  captureBtn: { backgroundColor: '#22C55E', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  captureBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  closeBtn: { position: 'absolute', top: 56, right: 20, padding: 8, zIndex: 10 },
  closeBtnText: { color: '#fff', fontSize: 24 },
  text: { color: '#fff', marginTop: 16 },
  btn: { backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#fff' },
  btnSecondaryText: { color: '#fff', fontSize: 16 },
  btnPrimary: { flex: 1 },
  preview: { flex: 1, width: '100%', padding: 20 },
  image: { width: '100%', height: 300, borderRadius: 8 },
  extracted: { padding: 20, width: '100%', backgroundColor: '#fff' },
  row: { marginBottom: 16 },
  label: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  value: { fontSize: 18, color: '#1F2937', fontWeight: '500' },
  amount: { color: '#22C55E', fontWeight: '700', fontSize: 24 },
  actions: { flexDirection: 'row', padding: 20, gap: 12 },
});
