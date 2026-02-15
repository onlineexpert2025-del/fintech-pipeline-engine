import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES } from '../utils/theme';

const INCOME_SOURCES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Gift',
  'Refund',
  'Other',
];

export const AddIncomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { addTransaction } = useApp();
  const [amount, setAmount] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    const source = selectedSource === 'Other' ? customSource : selectedSource;
    if (!amount || !source) return;
    
    setLoading(true);
    try {
      await addTransaction({
        type: 'income',
        amount: parseFloat(amount),
        category: 'income',
        source: source,
        date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD local date
      });
      setShowSuccess(true);
      setTimeout(() => navigation.goBack(), 1000);
    } catch (error) {
      console.error('Error adding income:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Amount Input */}
          <View style={styles.amountSection}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textLight}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
          </View>

          {/* Source Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Source</Text>
            <View style={styles.sourcesGrid}>
              {INCOME_SOURCES.map((source) => (
                <Button
                  key={source}
                  mode={selectedSource === source ? 'contained' : 'outlined'}
                  onPress={() => setSelectedSource(source)}
                  style={[
                    styles.sourceButton,
                    selectedSource === source && styles.selectedSource,
                  ]}
                  labelStyle={[
                    styles.sourceLabel,
                    selectedSource === source && styles.selectedSourceLabel,
                  ]}
                >
                  {source}
                </Button>
              ))}
            </View>

            {selectedSource === 'Other' && (
              <TextInput
                style={styles.customInput}
                placeholder="Enter source..."
                placeholderTextColor={COLORS.textLight}
                value={customSource}
                onChangeText={setCustomSource}
              />
            )}
          </View>
        </ScrollView>

        {/* ANDROID FIX: Add extra padding to prevent button from hiding behind navigation bar */}
        <View style={[
          styles.buttonContainer, 
          { 
            paddingBottom: Platform.OS === 'android' 
              ? Math.max(insets.bottom, 24) + SPACING.xl + 16 // Android: extra padding
              : Math.max(insets.bottom, 16) + SPACING.md // iOS: normal padding
          }
        ]}>
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={!amount || (!selectedSource || (selectedSource === 'Other' && !customSource)) || loading}
            loading={loading}
            style={styles.saveButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Add Income
          </Button>
        </View>
      </KeyboardAvoidingView>

      {/* Success Snackbar */}
      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={1000}
        style={{ backgroundColor: COLORS.success }}
      >
        ✅ Income added successfully!
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  amountSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.text,
  },
  section: {
    padding: SPACING.lg,
  },
  sourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sourceButton: {
    borderRadius: 20,
    borderColor: COLORS.border,
  },
  selectedSource: {
    backgroundColor: COLORS.primary,
  },
  sourceLabel: {
    color: COLORS.textSecondary,
  },
  selectedSourceLabel: {
    color: COLORS.white,
  },
  customInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonContainer: {
    padding: SPACING.lg,
  },
  saveButton: {
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  buttonContent: {
    paddingVertical: SPACING.sm,
  },
  buttonLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
});
