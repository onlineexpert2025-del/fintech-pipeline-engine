import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../context/AppContext';
import { SPACING, FONT_SIZES, ColorPalette } from '../utils/theme';

export const TermsScreen: React.FC = () => {
  const COLORS = useColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By downloading, installing, or using GoalPulse, you agree to be bound by these
          Terms of Service. If you do not agree to these terms, please do not use the app.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          GoalPulse is a personal finance tracking application that helps users manage
          their savings goals, track expenses and income, and scan receipts. The app
          operates entirely offline with all data stored locally on your device.
        </Text>

        <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
        <Text style={styles.paragraph}>As a user of GoalPulse, you agree to:</Text>
        <Text style={styles.bulletPoint}>• Provide accurate financial information for your own records</Text>
        <Text style={styles.bulletPoint}>• Keep your device secure to protect your financial data</Text>
        <Text style={styles.bulletPoint}>• Use the app only for personal, non-commercial purposes</Text>
        <Text style={styles.bulletPoint}>• Not attempt to reverse engineer or modify the app</Text>

        <Text style={styles.sectionTitle}>4. Financial Disclaimer</Text>
        <Text style={styles.paragraph}>
          GoalPulse is a tracking tool only and does not provide financial advice. The
          calculations, projections, and estimates provided are for informational purposes
          only. We recommend consulting with a qualified financial advisor for important
          financial decisions.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Accuracy</Text>
        <Text style={styles.paragraph}>
          You are solely responsible for the accuracy of data you enter into GoalPulse.
          The OCR receipt scanning feature may not always be 100% accurate, and you should
          verify all scanned amounts before saving.
        </Text>

        <Text style={styles.sectionTitle}>6. Data Loss</Text>
        <Text style={styles.paragraph}>
          Since all data is stored locally on your device, you are responsible for backing
          up your data. We are not liable for any data loss due to device failure, app
          uninstallation, or any other circumstances.
        </Text>

        <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          GoalPulse and all its content, features, and functionality are owned by the app
          developers and are protected by international copyright, trademark, and other
          intellectual property laws.
        </Text>

        <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, GoalPulse and its developers shall not
          be liable for any indirect, incidental, special, consequential, or punitive
          damages resulting from your use of the app.
        </Text>

        <Text style={styles.sectionTitle}>9. Updates and Changes</Text>
        <Text style={styles.paragraph}>
          We may update the app and these terms from time to time. Continued use of the
          app after changes constitutes acceptance of the new terms.
        </Text>

        <Text style={styles.sectionTitle}>10. Termination</Text>
        <Text style={styles.paragraph}>
          You may stop using GoalPulse at any time by uninstalling the app. Upon
          uninstallation, all locally stored data will be permanently deleted.
        </Text>

        <Text style={styles.sectionTitle}>11. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by and construed in accordance with applicable
          laws, without regard to conflict of law principles.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact</Text>
        <Text style={styles.paragraph}>
          For questions about these Terms of Service, please contact us through the app's
          feedback feature.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 GoalPulse. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (COLORS: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  lastUpdated: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  paragraph: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  bulletPoint: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    paddingLeft: SPACING.md,
  },
  footer: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
});
