/**
 * Unified notification service
 * Handles SMS and email notifications based on user preferences
 */

import { query } from "@/lib/db";
import { sendOtp } from "@/lib/sms";
import {
  sendWelcomeEmail,
  sendPayoutReceivedEmail,
  sendContributionReminderEmail,
  sendCircleCompletedEmail,
} from "@/lib/email";
import type { NotificationPreference } from "@/types";

interface User {
  id: string;
  phone: string;
  email?: string;
  displayName: string;
  notificationPreference: NotificationPreference;
}

/**
 * Get user notification preferences
 */
async function getUserPreferences(userId: string): Promise<User | null> {
  const { rows } = await query<User>(
    "SELECT id, phone, email, display_name as \"displayName\", notification_preference as \"notificationPreference\" FROM users WHERE id = $1",
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Send welcome notification to new user
 */
export async function sendWelcomeNotification(userId: string): Promise<void> {
  const user = await getUserPreferences(userId);
  if (!user) return;

  const tasks: Promise<void>[] = [];

  if (
    (user.notificationPreference === "email" || user.notificationPreference === "both") &&
    user.email
  ) {
    tasks.push(sendWelcomeEmail(user.email, user.displayName));
  }

  if (user.notificationPreference === "sms" || user.notificationPreference === "both") {
    // SMS welcome message via Termii
    // Note: sendOtp is for OTP, we'd need a generic SMS function
    // For now, we'll skip SMS welcome or implement a generic sendSms function
  }

  await Promise.allSettled(tasks);
}

/**
 * Send payout received notification
 */
export async function sendPayoutNotification(
  userId: string,
  circleName: string,
  amount: string,
  currency: string,
  txHash: string
): Promise<void> {
  const user = await getUserPreferences(userId);
  if (!user) return;

  const tasks: Promise<void>[] = [];

  if (
    (user.notificationPreference === "email" || user.notificationPreference === "both") &&
    user.email
  ) {
    tasks.push(
      sendPayoutReceivedEmail(user.email, user.displayName, circleName, amount, currency, txHash)
    );
  }

  if (user.notificationPreference === "sms" || user.notificationPreference === "both") {
    // SMS notification: "You received ${amount} ${currency} from ${circleName}. Tx: ${txHash.slice(0, 8)}..."
    // Would need generic sendSms function
  }

  await Promise.allSettled(tasks);
}

/**
 * Send contribution reminder notification
 */
export async function sendContributionReminder(
  userId: string,
  circleName: string,
  amount: string,
  currency: string,
  dueDate: Date
): Promise<void> {
  const user = await getUserPreferences(userId);
  if (!user) return;

  const tasks: Promise<void>[] = [];

  if (
    (user.notificationPreference === "email" || user.notificationPreference === "both") &&
    user.email
  ) {
    tasks.push(
      sendContributionReminderEmail(
        user.email,
        user.displayName,
        circleName,
        amount,
        currency,
        dueDate
      )
    );
  }

  if (user.notificationPreference === "sms" || user.notificationPreference === "both") {
    // SMS reminder: "Reminder: ${amount} ${currency} contribution due for ${circleName} by ${dueDate}"
    // Would need generic sendSms function
  }

  await Promise.allSettled(tasks);
}

/**
 * Send circle completed notification
 */
export async function sendCircleCompletedNotification(
  userId: string,
  circleName: string
): Promise<void> {
  const user = await getUserPreferences(userId);
  if (!user) return;

  const tasks: Promise<void>[] = [];

  if (
    (user.notificationPreference === "email" || user.notificationPreference === "both") &&
    user.email
  ) {
    tasks.push(sendCircleCompletedEmail(user.email, user.displayName, circleName));
  }

  if (user.notificationPreference === "sms" || user.notificationPreference === "both") {
    // SMS: "Circle ${circleName} completed! Your reputation has been updated."
    // Would need generic sendSms function
  }

  await Promise.allSettled(tasks);
}

/**
 * Send notifications to all members of a circle
 */
export async function notifyCircleMembers(
  circleId: string,
  notificationType: "payout" | "reminder" | "completed",
  data: {
    circleName: string;
    amount?: string;
    currency?: string;
    txHash?: string;
    dueDate?: Date;
  }
): Promise<void> {
  const { rows: members } = await query<{ user_id: string }>(
    "SELECT user_id FROM members WHERE circle_id = $1",
    [circleId]
  );

  const tasks = members.map(async (member) => {
    switch (notificationType) {
      case "payout":
        if (data.amount && data.currency && data.txHash) {
          await sendPayoutNotification(
            member.user_id,
            data.circleName,
            data.amount,
            data.currency,
            data.txHash
          );
        }
        break;
      case "reminder":
        if (data.amount && data.currency && data.dueDate) {
          await sendContributionReminder(
            member.user_id,
            data.circleName,
            data.amount,
            data.currency,
            data.dueDate
          );
        }
        break;
      case "completed":
        await sendCircleCompletedNotification(member.user_id, data.circleName);
        break;
    }
  });

  await Promise.allSettled(tasks);
}
