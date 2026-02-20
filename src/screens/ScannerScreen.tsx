import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../utils/theme';
import { performMLKitOCR, parseReceiptData, performMockOCR } from '../services/MLKitOCRService';
import { setSystemInteraction } from '../utils/systemInteraction';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
// ... existing imports

export const ScannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraRef, setCameraRef] = useState<any>(null);

  // HIDDEN DEV MODE: Defaults to __DEV__
  const [devMode, setDevMode] = useState(__DEV__);
  const [devTapCount, setDevTapCount] = useState(0);

  // Toggle Dev Mode on 7 taps
  const handleDevTap = () => {
    const newCount = devTapCount + 1;
    setDevTapCount(newCount);
    if (newCount >= 7) {
      setDevMode(!devMode);
      setDevTapCount(0);
      Alert.alert(
        !devMode ? '👨‍💻 Developer Mode Enabled' : 'Developer Mode Disabled',
        !devMode ? 'Debug overlay and self-test enabled.' : 'Debug tools hidden.'
      );
    }
  };

  // DEBUG: Track URI for on-screen verification
  const [debugInfo, setDebugInfo] = useState<{
    uri: string;
    type: string;
    fileSize?: number;
    exists?: boolean;
    textLength?: number;
    preview?: string;
  } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // ... permission handlers ...

  // Process image with ML Kit OCR
  const handleProcessImage = async () => {
    if (!capturedImage) {
      Alert.alert('Error', 'No image selected');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[Scanner] Processing image:', capturedImage);

      // DEBUG info - Check file existence and size
      let size = 0;
      let exists = false;
      try {
        const info = await FileSystem.getInfoAsync(capturedImage);
        exists = info.exists;
        if (info.exists) size = info.size;
      } catch (e) { console.warn('[Scanner] Failed to get file info:', e); }

      const debugData = {
        uri: capturedImage,
        type: capturedImage.startsWith('file://') ? 'file://' : 'other',
        fileSize: size,
        exists
      };
      setDebugInfo(debugData);

      // Only show debug if Dev Mode is enabled
      if (devMode) {
        setShowDebug(true);
      }

      // Process with OCR (gallery URIs work directly, camera URIs are already stable after takePictureAsync)
      const ocrResult = await performMLKitOCR(capturedImage);

      // Update debug info with result
      setDebugInfo(prev => ({
        ...prev!,
        textLength: ocrResult.text.length,
        preview: ocrResult.text.substring(0, 50).replace(/\n/g, ' ')
      }));

      // Parse receipt data (extract merchant, total, date)
      const parsedReceipt = parseReceiptData(ocrResult);

      console.log('[Scanner] OCR complete:', {
        lines: ocrResult.lines.length,
        merchant: parsedReceipt.merchantName,
        total: parsedReceipt.totalAmount,
        date: parsedReceipt.date,
      });

      // Show info if OCR couldn't extract data
      if (!parsedReceipt.merchantName && !parsedReceipt.totalAmount) {
        // Navigate anyway - user will enter manually
        console.log('[Scanner] OCR returned empty - user will enter manually');
      }

      // Navigate to ResultScreen with parsed data (or empty for manual entry)
      navigation.navigate('ResultScreen', {
        text: ocrResult.text || '',
        lines: ocrResult.lines || [],
        merchantName: parsedReceipt.merchantName || '',
        totalAmount: parsedReceipt.totalAmount || undefined,
        date: parsedReceipt.date,
        imageUri: capturedImage,
      });

      // Reset state
      setCapturedImage(null);
      setIsProcessing(false);
    } catch (error) {
      console.error('[Scanner] OCR error:', error);
      setIsProcessing(false);

      // Still navigate to ResultScreen - user can enter manually
      navigation.navigate('ResultScreen', {
        text: '',
        lines: [],
        merchantName: '',
        totalAmount: undefined,
        date: undefined,
        imageUri: capturedImage,
      });

      setCapturedImage(null);
    }
  };

  // Self-Test for Debugging
  const handleSelfTest = async () => {
    setIsProcessing(true);
    try {
      console.log('[Scanner] Starting Self-Test...');
      // Use icon.png as test asset
      const asset = Asset.fromModule(require('../../assets/icon.png'));
      await asset.downloadAsync();

      const uri = asset.localUri || asset.uri;
      console.log('[Scanner] Self-Test Asset URI:', uri);

      let size = 0;
      let exists = false;
      try {
        const info = await FileSystem.getInfoAsync(uri);
        exists = info.exists;
        if (info.exists) size = info.size;
      } catch (e) { console.warn(e); }

      setDebugInfo({
        uri,
        type: 'asset',
        fileSize: size,
        exists
      });
      setShowDebug(true);

      const ocrResult = await performMLKitOCR(uri);

      setDebugInfo(prev => ({
        ...prev!,
        textLength: ocrResult.text.length,
        preview: ocrResult.text.substring(0, 50)
      }));

      Alert.alert('Self-Test Complete', `Pipeline worked.\nFile: ${exists ? 'Found' : 'Missing'}\nSize: ${size}b\nText: ${ocrResult.text.length} chars`);
    } catch (e) {
      console.error(e);
      Alert.alert('Self-Test Failed', String(e));
    } finally {
      setIsProcessing(false);
    }
  };

  // Request camera permission
  const handleRequestPermission = async () => {
    // FIX #2: Set system interaction flag before camera access
    setSystemInteraction(true);
    try {
      const result = await requestPermission();
      if (result.granted) {
        setCameraActive(true);
      }
    } finally {
      // Clear flag after a delay
      setTimeout(() => setSystemInteraction(false), 1000);
    }
  };

  // Open camera
  const handleOpenCamera = async () => {
    // FIX #2: Set system interaction flag before camera
    setSystemInteraction(true);
    setCameraActive(true);
    // Clear flag after camera opens
    setTimeout(() => setSystemInteraction(false), 1000);
  };

  // Take photo with camera
  const handleTakePhoto = async () => {
    if (!cameraRef) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      console.log('[Scanner] Taking photo...');
      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      console.log('[Scanner] Photo captured:', photo.uri);
      setCapturedImage(photo.uri);
      setCameraActive(false);
    } catch (error) {
      console.error('[Scanner] Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Pick image from gallery
  const handlePickImage = async () => {
    try {
      // FIX #2: Set system interaction flag before opening gallery
      setSystemInteraction(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('[Scanner] Image picked:', result.assets[0].uri);
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[Scanner] Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      // Clear flag after gallery closes
      setTimeout(() => setSystemInteraction(false), 1000);
    }
  };

  // Cancel/retake
  const handleCancel = () => {
    setCapturedImage(null);
    setCameraActive(false);
  };

  // Render camera view
  if (cameraActive) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="back" ref={(ref) => setCameraRef(ref)}>
          <SafeAreaView style={styles.cameraControls} edges={['top', 'bottom']}>
            <View style={styles.cameraTopBar}>
              <Pressable style={styles.cameraButton} onPress={() => setCameraActive(false)}>
                <MaterialIcons name="close" size={28} color="white" />
              </Pressable>
            </View>

            <View style={styles.cameraBottomBar}>
              <Pressable style={styles.captureButton} onPress={handleTakePhoto}>
                <View style={styles.captureButtonInner} />
              </Pressable>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  // Render preview and controls
  return (
    <LinearGradient colors={[COLORS.background, COLORS.backgroundEnd]} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['bottom']}>
        <View style={styles.content}>
          {/* Info Banner */}
          {Platform.OS === 'web' && (
            <View style={styles.infoBanner}>
              <MaterialIcons name="info" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                On-device OCR works in standalone builds only. Web shows demo data.
              </Text>
            </View>
          )}

          {/* Image Preview */}
          <View style={styles.previewContainer}>
            {capturedImage ? (
              <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="contain" />
            ) : (
              <Pressable style={styles.placeholderContainer} onPress={handleDevTap}>
                <MaterialIcons name="receipt" size={80} color={COLORS.textLight} />
                <Text style={styles.placeholderText}>No image selected</Text>
                <Text style={styles.placeholderSubtext}>Take a photo or pick from gallery</Text>
              </Pressable>
            )}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {!capturedImage ? (
              // Image selection buttons
              <>
                {!permission?.granted ? (
                  <Button
                    mode="contained"
                    onPress={handleRequestPermission}
                    style={styles.button}
                    icon="camera"
                  >
                    Grant Camera Permission
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    onPress={handleOpenCamera}
                    style={styles.button}
                    icon="camera"
                  >
                    Take Photo
                  </Button>
                )}

                <Button
                  mode="outlined"
                  onPress={handlePickImage}
                  style={[styles.button, styles.outlinedButton]}
                  icon="image"
                >
                  Pick from Gallery
                </Button>

                {/* DEV ONLY: Self-Test Button */}
                <Button
                  mode="text"
                  onPress={handleSelfTest}
                  compact
                  textColor={COLORS.textLight}
                  icon="bug"
                >
                  Run OCR Self-Test
                </Button>
              </>
            ) : (
              // Process/retake buttons
              <>
                <Button
                  mode="contained"
                  onPress={handleProcessImage}
                  style={styles.button}
                  icon="text-recognition"
                  loading={isProcessing}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Process with OCR'}
                </Button>

                <Button
                  mode="outlined"
                  onPress={handleCancel}
                  style={[styles.button, styles.outlinedButton]}
                  icon="refresh"
                  disabled={isProcessing}
                >
                  Retake
                </Button>
              </>
            )}
          </View>

          {/* Processing indicator */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.processingText}>Processing image...</Text>
              <Text style={styles.processingSubtext}>
                {Platform.OS === 'web'
                  ? 'Using demo data (standalone build needed for real OCR)'
                  : 'Extracting text with on-device OCR'}
              </Text>
            </View>
          )}
        </View>

        {/* ENHANCED DEBUG STAMP */}
        {debugInfo && showDebug && (
          <View style={styles.debugOverlay}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={[styles.debugText, { fontWeight: 'bold', color: '#FFF' }]}>OCR Debug</Text>
              <Pressable onPress={() => setShowDebug(false)} hitSlop={10}>
                <MaterialIcons name="close" size={14} color="#FFF" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 100 }}>
              <Text style={styles.debugText}>Type: {debugInfo.type}</Text>
              <Text style={styles.debugText}>
                File: {debugInfo.exists === undefined ? '?' : debugInfo.exists ? '✅ Found' : '❌ Missing'}
                {debugInfo.fileSize ? ` (${(debugInfo.fileSize / 1024).toFixed(1)} KB)` : ''}
              </Text>
              {debugInfo.textLength !== undefined && (
                <Text style={styles.debugText}>Text Len: {debugInfo.textLength} chars</Text>
              )}
              {debugInfo.preview && (
                <Text style={styles.debugText} numberOfLines={2}>
                  Preview: {debugInfo.preview}
                </Text>
              )}
              <Text style={[styles.debugText, { opacity: 0.7, fontSize: 9, marginTop: 2 }]}>
                {debugInfo.uri.slice(-40)}
              </Text>
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    padding: SPACING.md,
    margin: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    lineHeight: 18,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    margin: SPACING.lg,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  placeholderText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  placeholderSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  controls: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  button: {
    borderRadius: 12,
  },
  outlinedButton: {
    borderColor: COLORS.primary,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  processingText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: 'white',
    marginTop: SPACING.md,
  },
  processingSubtext: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: SPACING.lg,
  },
  cameraBottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  cameraButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  debugOverlay: {
    position: 'absolute',
    top: 60, // Top-left, below header area
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 8,
    zIndex: 999,
    width: 150,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  debugText: {
    color: 'white',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
});
