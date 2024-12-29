import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { EmailModule } from '../email/email.module';
import { TasksProcessor } from './tasks.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reminders',
    }),
    TypeOrmModule.forFeature([Task]),
    ScheduleModule.forRoot(),
    EmailModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksProcessor],
})
export class TasksModule {}
