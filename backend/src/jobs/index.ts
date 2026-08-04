import cron from 'node-cron';
import { MembershipReminderJob } from './membershipReminder.job';
import { BirthdayReminderJob } from './birthdayReminder.job';
import { logger } from '../config/logger';

export function initCronJobs(): void {
  logger.info('⏰ Initializing automated cron job schedulers...');

  // 1. Membership & Renewal Reminders — Runs daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('⏰ Executing daily automated membership reminder cron job...');
    try {
      await MembershipReminderJob.runReminders();
    } catch (error) {
      logger.error(`❌ Membership reminder cron job failed: ${error}`);
    }
  });

  // 2. Birthday Wishes — Runs daily at 9:15 AM
  cron.schedule('15 9 * * *', async () => {
    logger.info('🎉 Executing daily birthday wishes cron job...');
    try {
      await BirthdayReminderJob.runBirthdayWishes();
    } catch (error) {
      logger.error(`❌ Birthday wishes cron job failed: ${error}`);
    }
  });

  logger.info('✅ Automated cron jobs scheduled successfully');
}
