/**
 * Local Notifications Service
 * Handles daily reminders and overspending alerts
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Not available on web');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission denied');
      return false;
    }

    console.log('[Notifications] Permission granted');
    return true;
  } catch (error) {
    console.error('[Notifications] Permission error:', error);
    return false;
  }
};

/**
 * Schedule daily expense reminder
 * @param hour - Hour in 24-hour format (0-23)
 * @param minute - Minute (0-59)
 */
export const scheduleDailyReminder = async (hour: number = 20, minute: number = 0): Promise<string | null> => {
  if (Platform.OS === 'web') return null;

  try {
    // Cancel existing daily reminder
    await cancelDailyReminder();

    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    // Schedule new daily notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💰 Track Your Expenses',
        body: "Don't forget to log today's expenses!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour: hour,
        minute: minute,
        repeats: true,
      } as any,
    });

    console.log('[Notifications] Daily reminder scheduled:', identifier);
    return identifier;
  } catch (error) {
    console.error('[Notifications] Failed to schedule daily reminder:', error);
    // Log specifics if available
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('Error message:', (error as any).message);
    }
    return null;
  }
};

/**
 * Cancel daily reminder notification
 */
export const cancelDailyReminder = async (): Promise<void> => {
  if (Platform.OS === 'web') return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const dailyReminders = scheduled.filter(notif =>
      notif.content.title?.includes('Track Your Expenses')
    );

    for (const reminder of dailyReminders) {
      await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
    }

    console.log('[Notifications] Daily reminders cancelled');
  } catch (error) {
    console.error('[Notifications] Failed to cancel daily reminder:', error);
  }
};

/**
 * Send immediate overspending alert
 * @param categoryName - Name of the category that exceeded budget
 * @param spent - Amount spent
 * @param budget - Budget limit
 */
export const sendOverspendingAlert = async (
  categoryName: string,
  spent: number,
  budget: number
): Promise<void> => {
  if (Platform.OS === 'web') return;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Budget Alert',
        body: `You've exceeded your ${categoryName} budget! Spent: $${spent.toFixed(2)} / $${budget.toFixed(2)}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'overspending',
          category: categoryName,
          spent,
          budget,
        },
      },
      trigger: null, // Send immediately
    });

    console.log('[Notifications] Overspending alert sent:', categoryName);
  } catch (error) {
    console.error('[Notifications] Failed to send overspending alert:', error);
  }
};

/**
 * Send goal achievement notification
 * @param goalName - Name of the achieved goal
 * @param amount - Goal amount
 */
export const sendGoalAchievedNotification = async (
  goalName: string,
  amount: number
): Promise<void> => {
  if (Platform.OS === 'web') return;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Goal Achieved!',
        body: `Congratulations! You've reached your "${goalName}" goal of $${amount.toFixed(2)}!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          type: 'goal_achieved',
          goalName,
          amount,
        },
      },
      trigger: null,
    });

    console.log('[Notifications] Goal achieved notification sent:', goalName);
  } catch (error) {
    console.error('[Notifications] Failed to send goal notification:', error);
  }
};

/**
 * Get all scheduled notifications (for debugging)
 */
export const getScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  if (Platform.OS === 'web') return [];

  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Failed to get scheduled notifications:', error);
    return [];
  }
};

/**
 * Cancel all notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] All notifications cancelled');
  } catch (error) {
    console.error('[Notifications] Failed to cancel all notifications:', error);
  }
};
