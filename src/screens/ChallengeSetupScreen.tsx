import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, FONT_SIZES } from '../utils/theme';

type ChallengeTotal = 5000 | 10000;
type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

interface DifficultyOption {
  key: ChallengeDifficulty;
  label: string;
  days: number;
  color: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { key: 'easy', label: 'Easy', days: 365, color: '#27AE60' },
  { key: 'medium', label: 'Medium', days: 265, color: '#F39C12' },
  { key: 'hard', label: 'Hard', days: 200, color: '#E74C3C' },
];

export const ChallengeSetupScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedTotal, setSelectedTotal] = useState<ChallengeTotal>(10000);
  const [selectedDifficulty, setSelectedDifficulty] = useState<ChallengeDifficulty>('easy');

  const getDifficultyDays = (difficulty: ChallengeDifficulty): number => {
    return DIFFICULTY_OPTIONS.find(d => d.key === difficulty)?.days || 365;
  };

  const getAveragePerDay = (): number => {
    const days = getDifficultyDays(selectedDifficulty);
    return selectedTotal / days;
  };

  const handleStartChallenge = async () => {
    try {
      const challengeData = {
        total: selectedTotal,
        difficulty: selectedDifficulty,
        days: getDifficultyDays(selectedDifficulty),
        startDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD local
        averagePerDay: getAveragePerDay(),
      };

      await AsyncStorage.setItem('savings_challenge_config', JSON.stringify(challengeData));
      
      Alert.alert(
        'Challenge Started!',
        `Your $${(selectedTotal / 1000).toFixed(0)}k challenge has begun. Good luck!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Failed to save challenge:', error);
      Alert.alert('Error', 'Failed to start challenge');
    }
  };

  const difficultyOption = DIFFICULTY_OPTIONS.find(d => d.key === selectedDifficulty);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>Setup Savings Challenge</Text>
        </View>

        {/* Total Amount Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenge Total</Text>
          <View style={styles.optionRow}>
            <Pressable
              style={[
                styles.totalOption,
                selectedTotal === 5000 && styles.totalOptionSelected,
              ]}
              onPress={() => setSelectedTotal(5000)}
            >
              <Text
                style={[
                  styles.totalOptionText,
                  selectedTotal === 5000 && styles.totalOptionTextSelected,
                ]}
              >
                $5,000
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.totalOption,
                selectedTotal === 10000 && styles.totalOptionSelected,
              ]}
              onPress={() => setSelectedTotal(10000)}
            >
              <Text
                style={[
                  styles.totalOptionText,
                  selectedTotal === 10000 && styles.totalOptionTextSelected,
                ]}
              >
                $10,000
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Difficulty Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Difficulty</Text>
          {DIFFICULTY_OPTIONS.map((option) => {
            const isSelected = selectedDifficulty === option.key;
            const avgPerDay = selectedTotal / option.days;

            return (
              <Pressable
                key={option.key}
                style={[
                  styles.difficultyCard,
                  isSelected && { borderColor: option.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedDifficulty(option.key)}
              >
                <View style={styles.difficultyHeader}>
                  <View style={[styles.difficultyBadge, { backgroundColor: option.color }]}>
                    <Text style={styles.difficultyBadgeText}>{option.label}</Text>
                  </View>
                  <Text style={styles.difficultyDays}>{option.days} days</Text>
                </View>
                <Text style={styles.difficultyAverage}>
                  ${avgPerDay.toFixed(2)}/day average
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Your Challenge</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Goal:</Text>
            <Text style={styles.summaryValue}>${selectedTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>{getDifficultyDays(selectedDifficulty)} days</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Per Day:</Text>
            <Text style={[styles.summaryValue, { color: difficultyOption?.color }]}>
              ${getAveragePerDay().toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryNote}>
            <MaterialIcons name="info" size={16} color="#666" />
            <Text style={styles.summaryNoteText}>
              First 30 days will be $5-$25 to build the habit
            </Text>
          </View>
        </View>

        {/* Start Button */}
        <Pressable style={styles.startButton} onPress={handleStartChallenge}>
          <Text style={styles.startButtonText}>Start Challenge</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  section: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  totalOption: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  totalOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F9FF',
  },
  totalOptionText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: '#666',
  },
  totalOptionTextSelected: {
    color: COLORS.primary,
  },
  difficultyCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  difficultyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  difficultyBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyBadgeText: {
    color: '#FFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  difficultyDays: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  difficultyAverage: {
    fontSize: FONT_SIZES.md,
    color: '#666',
  },
  summary: {
    backgroundColor: '#FFF',
    marginHorizontal: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.md,
    color: '#666',
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    gap: SPACING.xs,
  },
  summaryNoteText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: '#666',
  },
  startButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
