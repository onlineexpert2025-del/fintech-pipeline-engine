import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, Pressable, Modal, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Snackbar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, CATEGORIES } from '../utils/theme';
import { useApp } from '../context/AppContext';
import * as db from '../services/database';

interface RouteParams {
  text: string;
  lines: string[];
  merchantName?: string;
  totalAmount?: number;
  date?: string;
  imageUri?: string;
}

type SplitEntry = {
  category: string;
  amount: string;
};

export const ResultScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { addReceipt, addTransaction } = useApp();
  const params = route.params as RouteParams;

  const { text = '', lines = [], imageUri } = params || {};

  // ALWAYS use device date/time (not OCR date)
  const deviceDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local date

  // Editable fields from OCR parsing
  const [merchantName, setMerchantName] = useState(params?.merchantName || '');
  const [totalAmount, setTotalAmount] = useState(params?.totalAmount?.toString() || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedText, setExpandedText] = useState(false);

  // Split receipt functionality
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitEntries, setSplitEntries] = useState<SplitEntry[]>([
    { category: '', amount: '' },
  ]);

  // Duplicate detection
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateDetected, setDuplicateDetected] = useState(false);

  // Check for duplicates on mount and when amount changes
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForDuplicates();
    }, 500); // Debounce manual typing
    return () => clearTimeout(timer);
  }, [totalAmount]);

  const checkForDuplicates = async () => {
    if (!totalAmount) return;

    const amount = parseFloat(totalAmount);
    if (isNaN(amount)) return;

    const dateKey = deviceDate.split('T')[0];
    const existingReceipts = await db.getReceiptsByDate(dateKey);

    // Check if any receipt has similar amount (within $0.50)
    const duplicate = existingReceipts.find(r =>
      Math.abs(r.totalAmount - amount) < 0.50
    );

    if (duplicate) {
      setDuplicateDetected(true);
      setShowDuplicateDialog(true);
    }
  };

  const handleSaveReceipt = async (forceSave = false) => {
    // Check for duplicates first (unless forced)
    if (!forceSave && duplicateDetected) {
      setShowDuplicateDialog(true);
      return;
    }

    // Validation
    if (!merchantName.trim()) {
      Alert.alert('Missing Info', 'Please enter a merchant/store name');
      return;
    }

    if (!totalAmount || isNaN(parseFloat(totalAmount))) {
      Alert.alert('Missing Info', 'Please enter a valid total amount');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Missing Info', 'Please select a category');
      return;
    }

    setSaving(true);

    try {
      // Save receipt with OCR date or device date
      // The database layer handles 'createdAt' with a precise ISO timestamp for uniqueness
      // If params.date (OCR date) is available and valid, use it. Otherwise use device date.
      const receiptDate = params.date || deviceDate;

      const receiptId = await addReceipt({
        storeName: merchantName.trim(),
        totalAmount: parseFloat(totalAmount),
        category: selectedCategory,
        date: receiptDate,
        imageUri: imageUri || '',
        ocrText: text,
      });

      // Auto-create expense transaction
      await addTransaction({
        type: 'expense',
        amount: parseFloat(totalAmount),
        category: selectedCategory,
        notes: `From receipt: ${merchantName.trim()}`,
        date: receiptDate,
        receiptId: receiptId,
      });

      setShowSuccess(true);

      // Navigate back after short delay
      setTimeout(() => {
        navigation.navigate('Main', { screen: 'Receipts' });
      }, 1500);
    } catch (error) {
      console.error('[ResultScreen] Failed to save receipt:', error);
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
      setSaving(false);
    }
  };

  const handleSaveSplitReceipt = async () => {
    // Validate split entries
    const validEntries = splitEntries.filter(e => e.category && e.amount && parseFloat(e.amount) > 0);
    if (validEntries.length === 0) {
      Alert.alert('Missing Info', 'Please add at least one category and amount');
      return;
    }

    const splitTotal = validEntries.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);
    const receiptTotal = parseFloat(totalAmount);

    if (Math.abs(splitTotal - receiptTotal) > 0.01) {
      Alert.alert(
        'Invalid Split',
        `Split amounts ($${splitTotal.toFixed(2)}) must equal total ($${receiptTotal.toFixed(2)})\n\nRemaining: $${(receiptTotal - splitTotal).toFixed(2)}`
      );
      return;
    }

    if (!merchantName.trim()) {
      Alert.alert('Missing Info', 'Please enter a merchant/store name');
      return;
    }

    setSaving(true);

    try {
      // Save receipt with first category
      // Use deviceDate (YYYY-MM-DD) for consistency
      const receiptDate = params.date || deviceDate;

      const receiptId = await addReceipt({
        storeName: merchantName.trim(),
        totalAmount: parseFloat(totalAmount),
        category: validEntries[0].category,
        date: receiptDate,
        imageUri: imageUri || '',
        ocrText: text,
      });

      // Create multiple expense transactions for each split
      for (const entry of validEntries) {
        await addTransaction({
          type: 'expense',
          amount: parseFloat(entry.amount),
          category: entry.category,
          notes: `Split from receipt: ${merchantName.trim()}`,
          date: receiptDate,
          receiptId: receiptId,
        });
      }

      setShowSuccess(true);
      setShowSplitModal(false);

      // Navigate back after short delay
      setTimeout(() => {
        navigation.navigate('Main', { screen: 'Receipts' });
      }, 1500);
    } catch (error) {
      console.error('[ResultScreen] Failed to save split receipt:', error);
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
      setSaving(false);
    }
  };

  const addSplitEntry = () => {
    const remaining = calculateRemaining();
    // Auto-fill with remaining amount if positive, else empty
    const autoFillAmount = remaining > 0 ? remaining.toFixed(2) : '';
    setSplitEntries([...splitEntries, { category: '', amount: autoFillAmount }]);
  };

  const removeSplitEntry = (index: number) => {
    const updated = splitEntries.filter((_, i) => i !== index);
    setSplitEntries(updated.length > 0 ? updated : [{ category: '', amount: '' }]);
  };

  const updateSplitEntry = (index: number, field: 'category' | 'amount', value: string) => {
    const updated = [...splitEntries];
    updated[index][field] = value;
    setSplitEntries(updated);
  };

  // Calculate remaining amount for split
  const calculateRemaining = () => {
    const total = parseFloat(totalAmount) || 0;
    const splitTotal = splitEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    return total - splitTotal;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* OCR Status Badge - conditional based on actual text extraction */}
        <View style={[styles.badge, !text && styles.badgeManual]}>
          <MaterialIcons
            name={text ? "check-circle" : "edit"}
            size={20}
            color={text ? COLORS.success : COLORS.warning}
          />
          <Text style={[styles.badgeText, !text && styles.badgeTextManual]}>
            {text ? 'Text Recognized' : 'Manual Entry Required'}
          </Text>
        </View>

        {/* Extracted Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt Details</Text>

          {/* Merchant Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Merchant/Store *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g., Walmart, Target"
              placeholderTextColor={COLORS.textLight}
              value={merchantName}
              onChangeText={setMerchantName}
            />
          </View>

          {/* Total Amount */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Total Amount *</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textLight}
                value={totalAmount}
                onChangeText={setTotalAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Date (Auto-filled with device date) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Receipt Date</Text>
            <Text style={styles.fieldValue}>
              {new Date(params.date || deviceDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category *</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === cat.id && {
                    backgroundColor: cat.color + '20',
                    borderColor: cat.color,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '30' }]}>
                  <MaterialIcons name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <Text
                  style={[
                    styles.categoryName,
                    selectedCategory === cat.id && { color: cat.color, fontWeight: '600' },
                  ]}
                  numberOfLines={2}
                >
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Raw OCR Text (Collapsible) */}
        <View style={styles.section}>
          <Pressable
            style={styles.collapsibleHeader}
            onPress={() => setExpandedText(!expandedText)}
          >
            <Text style={styles.sectionTitle}>Raw OCR Text</Text>
            <MaterialIcons
              name={expandedText ? 'expand-less' : 'expand-more'}
              size={24}
              color={COLORS.textLight}
            />
          </Pressable>

          {expandedText && (
            <View style={styles.textBox}>
              <Text style={styles.textContent}>{text || 'No text detected'}</Text>
            </View>
          )}
        </View>

        {/* Lines Preview */}
        {lines.length > 0 && expandedText && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lines ({lines.length})</Text>
            {lines.slice(0, 10).map((line, index) => (
              <View key={index} style={styles.lineItem}>
                <Text style={styles.lineNumber}>{index + 1}</Text>
                <Text style={styles.lineText} numberOfLines={1}>
                  {line}
                </Text>
              </View>
            ))}
            {lines.length > 10 && (
              <Text style={styles.moreText}>... and {lines.length - 10} more lines</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      {/* ANDROID FIX: Add extra padding to prevent buttons from hiding behind navigation bar */}
      <View style={[
        styles.footer,
        {
          paddingBottom: Platform.OS === 'android'
            ? Math.max(insets.bottom, 24) + SPACING.xl + 16 // Android: extra padding
            : Math.max(insets.bottom, 16) + SPACING.md // iOS: normal padding
        }
      ]}>
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            mode="outlined"
            onPress={() => setShowSplitModal(true)}
            style={styles.splitButton}
            disabled={saving || !totalAmount}
            icon="call-split"
          >
            Split
          </Button>
        </View>
        <Button
          mode="contained"
          onPress={() => handleSaveReceipt(false)}
          style={styles.saveButton}
          loading={saving}
          disabled={saving}
        >
          Save Receipt
        </Button>
      </View>

      {/* Duplicate Detection Dialog — inline Modal (no Portal dependency) */}
      <Modal
        visible={showDuplicateDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDuplicateDialog(false)}
      >
        <Pressable
          style={styles.duplicateOverlay}
          onPress={() => setShowDuplicateDialog(false)}
        >
          <Pressable style={styles.duplicateDialog} onPress={() => { }}
          >
            <MaterialIcons name="warning" size={32} color={COLORS.warning} style={{ alignSelf: 'center', marginBottom: SPACING.sm }} />
            <Text style={styles.dialogTitle}>Duplicate Receipt?</Text>
            <Text style={styles.dialogText}>
              Looks like a duplicate receipt from today. Add anyway?
            </Text>
            <View style={styles.dialogButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowDuplicateDialog(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  setShowDuplicateDialog(false);
                  setDuplicateDetected(false);
                  handleSaveReceipt(true);
                }}
                buttonColor={COLORS.primary}
                style={{ flex: 1 }}
              >
                Add Anyway
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Split Receipt Modal */}
      <Modal
        visible={showSplitModal}
        animationType="slide"
        onRequestClose={() => setShowSplitModal(false)}
      >
        <LinearGradient colors={[COLORS.background, COLORS.backgroundEnd]} style={{ flex: 1 }}>
          <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
            <View style={styles.header}>
              <Pressable
                style={styles.headerBackBtn}
                onPress={() => setShowSplitModal(false)}
                hitSlop={8}
              >
                <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
              </Pressable>
              <Text style={styles.headerTitle}>Split Receipt</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.splitContent} contentContainerStyle={{ paddingBottom: 100 }}>
              {/* Split Summary */}
              <View style={styles.splitSummary}>
                <Text style={styles.splitInfo}>
                  Total: ${totalAmount}
                </Text>
                <Text style={[
                  styles.splitRemaining,
                  calculateRemaining() < 0 && { color: COLORS.error }
                ]}>
                  Remaining: ${calculateRemaining().toFixed(2)}
                </Text>
              </View>

              {splitEntries.map((entry, index) => {
                const cat = CATEGORIES.find(c => c.id === entry.category);
                return (
                  <View key={index} style={styles.splitEntry}>
                    <View style={styles.splitEntryHeader}>
                      <Text style={styles.splitEntryTitle}>Split {index + 1}</Text>
                      {splitEntries.length > 1 && (
                        <Pressable
                          style={styles.splitDeleteBtn}
                          onPress={() => removeSplitEntry(index)}
                          hitSlop={8}
                        >
                          <MaterialIcons name="delete" size={20} color={COLORS.error} />
                        </Pressable>
                      )}
                    </View>

                    {/* Category Pills */}
                    <View style={styles.categoriesGrid}>
                      {CATEGORIES.map((category) => (
                        <Pressable
                          key={category.id}
                          style={[
                            styles.categoryPill,
                            entry.category === category.id && {
                              backgroundColor: category.color + '20',
                              borderColor: category.color,
                            },
                          ]}
                          onPress={() => updateSplitEntry(index, 'category', category.id)}
                        >
                          <MaterialIcons name={category.icon as any} size={16} color={category.color} />
                          <Text
                            style={[
                              styles.categoryPillText,
                              entry.category === category.id && { color: category.color },
                            ]}
                            numberOfLines={1}
                          >
                            {category.name.split('/')[0].trim()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Amount Input */}
                    <View style={styles.splitAmountContainer}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={styles.splitAmountInput}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textLight}
                        value={entry.amount}
                        onChangeText={(value) => updateSplitEntry(index, 'amount', value)}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    {/* Visual Validation */}
                    {entry.category && entry.amount && (
                      <View style={styles.splitPreview}>
                        <MaterialIcons name={cat?.icon as any} size={16} color={cat?.color || COLORS.textLight} />
                        <Text style={styles.splitPreviewText}>
                          {cat?.name}: ${parseFloat(entry.amount).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}

              <Button
                mode="outlined"
                onPress={addSplitEntry}
                style={styles.addSplitButton}
                icon="plus"
              >
                Add Another Category
              </Button>
            </ScrollView>

            <View style={[styles.splitFooter, { paddingBottom: Math.max(insets.bottom, 16) + SPACING.md }]}>
              <Button
                mode="contained"
                onPress={handleSaveSplitReceipt}
                style={styles.saveSplitButton}
                loading={saving}
                disabled={saving || Math.abs(calculateRemaining()) > 0.01}
              >
                Save Split Receipt
              </Button>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Modal>

      {/* Success Snackbar */}
      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={1500}
        style={styles.snackbar}
      >
        ✅ Receipt saved successfully!
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 100, // Space for footer
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  badgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: SPACING.xs,
  },
  badgeManual: {
    backgroundColor: COLORS.warning + '20',
  },
  badgeTextManual: {
    color: COLORS.warning,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  fieldContainer: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  fieldInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldValue: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  categoryName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textContent: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  lineItem: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lineNumber: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginRight: SPACING.sm,
    minWidth: 20,
  },
  lineText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  moreText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
  footer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
  },
  splitButton: {
    flex: 1,
  },
  saveButton: {
    width: '100%',
  },
  // Duplicate detection inline modal
  duplicateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  duplicateDialog: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialogTitle: {
    textAlign: 'center',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  dialogText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  splitDeleteBtn: {
    padding: SPACING.xs,
    borderRadius: 8,
  },
  // Split Modal Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerBackBtn: {
    padding: SPACING.xs,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
  },
  splitContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  splitSummary: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  splitInfo: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  splitRemaining: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  splitEntry: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  splitEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  splitEntryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  categoryPillText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  splitAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  splitAmountInput: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
  splitPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  splitPreviewText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  addSplitButton: {
    marginTop: SPACING.md,
  },
  splitFooter: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  saveSplitButton: {
    width: '100%',
  },
  snackbar: {
    backgroundColor: COLORS.success,
  },
});
