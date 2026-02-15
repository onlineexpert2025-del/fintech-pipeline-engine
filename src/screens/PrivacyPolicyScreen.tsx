import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES } from '../utils/theme';

export const PrivacyPolicyScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>

        <Text style={styles.sectionTitle}>Introduction</Text>
        <Text style={styles.paragraph}>
          GoalPulse ("we", "our", or "us") is committed to protecting your privacy. 
          This Privacy Policy explains how we collect, use, and safeguard your information 
          when you use our mobile application.
        </Text>

        <Text style={styles.sectionTitle}>Information We Collect</Text>
        <Text style={styles.paragraph}>
          GoalPulse stores all data locally on your device. We do not collect, transmit, 
          or store any personal information on external servers. The data stored includes:
        </Text>
        <Text style={styles.bulletPoint}>• Financial goals and targets you set</Text>
        <Text style={styles.bulletPoint}>• Income and expense transactions you enter</Text>
        <Text style={styles.bulletPoint}>• Receipt images you scan (stored locally)</Text>
        <Text style={styles.bulletPoint}>• App preferences and settings</Text>

        <Text style={styles.sectionTitle}>Data Storage</Text>
        <Text style={styles.paragraph}>
          All your financial data is stored exclusively on your device using secure local 
          storage. We do not have access to your data, and it is never uploaded to any 
          cloud service unless you explicitly choose to backup using third-party services.
        </Text>

        <Text style={styles.sectionTitle}>Camera & Photo Access</Text>
        <Text style={styles.paragraph}>
          GoalPulse requests camera access solely for scanning receipts. Photos are 
          processed locally on your device and are not transmitted anywhere. You can 
          deny camera access, but the receipt scanning feature will not function.
        </Text>

        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.paragraph}>
          Our app does not integrate with any third-party analytics, advertising, or 
          tracking services. Your usage data remains private and is not shared.
        </Text>

        <Text style={styles.sectionTitle}>Data Export & Backup</Text>
        <Text style={styles.paragraph}>
          You can export your data as CSV or JSON files. These exports are generated 
          locally and shared using your device's built-in sharing functionality. We do 
          not receive copies of your exported data.
        </Text>

        <Text style={styles.sectionTitle}>Security</Text>
        <Text style={styles.paragraph}>
          We implement industry-standard security measures to protect your locally stored 
          data. However, please ensure your device is secured with a passcode or biometric 
          authentication for additional protection.
        </Text>

        <Text style={styles.sectionTitle}>Children's Privacy</Text>
        <Text style={styles.paragraph}>
          GoalPulse is not intended for children under 13. We do not knowingly collect 
          information from children under 13 years of age.
        </Text>

        <Text style={styles.sectionTitle}>Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of any 
          changes by updating the "Last Updated" date at the top of this policy.
        </Text>

        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy, please contact us through the 
          app's feedback feature or visit our website.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 GoalPulse. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
