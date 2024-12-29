import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

import { EmailService } from '../email/email.service';

@Processor('reminders')
export class TasksProcessor {
  constructor(private readonly emailService: EmailService) {
    console.log('TasksProcessor initialized');
  }

  @Process()
  async handleReminder(job: Job) {
    const { email, title } = job.data;
    console.log(`Processing job: ${job.id}, Data:`, job.data);

    try {
      console.log(`Sending reminder email to ${email}`);
      const subject = `Reminder: ${title}`;
      const text = `This is a reminder for your task: "${title}". Please complete it on time!`;

      await this.emailService.sendEmail(email, subject, text);
      console.log('Reminder email sent successfully');
    } catch (error) {
      console.error('Error processing job:', error);
    }
  }
}
