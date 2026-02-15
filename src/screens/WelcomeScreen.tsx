import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES } from '../utils/theme';

export const WelcomeScreen: React.FC = () => {
  const { setGoal, completeSetup } = useApp();
  const [step, setStep] = useState(1);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlySavings, setMonthlySavings] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 1 && goalName.trim()) {
      setStep(2);
    } else if (step === 2 && targetAmount.trim()) {
      setStep(3);
    }
  };

  const handleComplete = async () => {
    if (!monthlySavings.trim()) return;
    setLoading(true);
    try {
      await setGoal({
        name: goalName.trim(),
        targetAmount: parseFloat(targetAmount),
        monthlySavingsTarget: parseFloat(monthlySavings),
        deadline: null,
      });
      await completeSetup();
    } catch (error) {
      console.error('Error setting up goal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <MaterialIcons name="track-changes" size={80} color={COLORS.primary} />
            <Text style={styles.title}>GoalPulse</Text>
            <Text style={styles.subtitle}>Your Personal Savings Tracker</Text>
          </View>

          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>What are you saving for?</Text>
              <Text style={styles.stepDescription}>Give your savings goal a name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Emergency Fund, New Car, Vacation"
                placeholderTextColor={COLORS.textLight}
                value={goalName}
                onChangeText={setGoalName}
                autoFocus
              />
              <Button
                mode="contained"
                onPress={handleNext}
                disabled={!goalName.trim()}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Next
              </Button>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>How much do you want to save?</Text>
              <Text style={styles.stepDescription}>Enter your target amount in USD</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  placeholder="10,000"
                  placeholderTextColor={COLORS.textLight}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
              <Button
                mode="contained"
                onPress={handleNext}
                disabled={!targetAmount.trim() || isNaN(parseFloat(targetAmount))}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Next
              </Button>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Monthly savings target?</Text>
              <Text style={styles.stepDescription}>How much can you save each month?</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  placeholder="500"
                  placeholderTextColor={COLORS.textLight}
                  value={monthlySavings}
                  onChangeText={setMonthlySavings}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
              <Button
                mode="contained"
                onPress={handleComplete}
                disabled={!monthlySavings.trim() || isNaN(parseFloat(monthlySavings)) || loading}
                loading={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Start Tracking
              </Button>
            </View>
          )}

          <View style={styles.progressDots}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[styles.dot, s === step && styles.activeDot, s < step && styles.completedDot]}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  stepContainer: {
    marginBottom: SPACING.xl,
  },
  stepTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  stepDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginRight: SPACING.sm,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
  },
  button: {
    marginTop: SPACING.lg,
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
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  completedDot: {
    backgroundColor: COLORS.primary,
  },
});
