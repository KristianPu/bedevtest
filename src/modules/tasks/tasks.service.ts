import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';
import { TaskStatus } from './enum/task-status.enum';
import { SearchTaskDto } from './dto/search-task.dto';

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectQueue('reminders') private readonly reminderQueue: Queue,
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    userId: string,
    email: string,
  ): Promise<Task> {
    const { deadline, reminder, title } = createTaskDto;
    const taskTitle = await this.taskRepository.findOne({
      where: {
        title,
      },
    });

    if (taskTitle) {
      throw new BadRequestException(`Task with title ${title} already exists`);
    }
    if (reminder && new Date(reminder) > new Date(deadline)) {
      throw new BadRequestException(
        'Reminder date cannot be after the deadline date',
      );
    }
    if (reminder && new Date(Date.now()) > new Date(reminder)) {
      throw new BadRequestException('Reminder date cannot be in the past');
    }

    const task = this.taskRepository.create({ ...createTaskDto, userId });
    const savedTask = await this.taskRepository.save(task);

    if (reminder) {
      const delay = new Date(reminder).getTime() - Date.now();
      await this.reminderQueue.add(
        { email, taskId: savedTask.id, title: task.title },
        { delay },
      );
    }
    return savedTask;
  }

  async findAll(searchTaskDto: SearchTaskDto, userId: string) {
    const {
      deadlineFrom,
      deadlineTo,
      page = 1,
      limit = 10,
      sort = 'title',
      order = Order.ASC,
    } = searchTaskDto;

    const query = this.taskRepository.createQueryBuilder('task');
    query.where('task.userId = :userId', { userId });

    if (deadlineFrom && deadlineTo) {
      query.andWhere('task.deadline BETWEEN :deadlineFrom AND :deadlineTo', {
        deadlineFrom,
        deadlineTo,
      });
    }
    if (deadlineFrom && !deadlineTo) {
      query.andWhere('task.deadline >= :deadlineFrom', { deadlineFrom });
    }
    if (!deadlineFrom && deadlineTo) {
      query.andWhere('task.deadline <= :deadlineTo', { deadlineTo });
    }

    query.orderBy(`task.${sort}`, order);
    query.skip((page - 1) * limit).take(limit);

    const [entities, itemCount] = await query.getManyAndCount();

    return {
      data: entities,
      itemCount,
      page,
      totalPages: Math.ceil(itemCount / limit),
    };
  }

  async update(id: number, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new BadRequestException(`Task with id ${id} not found`);
    }

    if (updateTaskDto.status) task.status = updateTaskDto.status;
    if (updateTaskDto.category) task.category = updateTaskDto.category;

    return await this.taskRepository.save(task);
  }

  async archiveOverdueTasks(): Promise<void> {
    const result = await this.taskRepository
      .createQueryBuilder()
      .update(Task)
      .set({ status: TaskStatus.ARCHIVED })
      .where(
        '(status IN (:...statuses) AND deadline < :overdueDate) OR status = :completedStatus',
        {
          statuses: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
          completedStatus: TaskStatus.COMPLETED,
          overdueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      )
      .execute();
    console.log(`Archived ${result.affected} tasks`);
  }

  @Cron('0 0 * * *')
  async handleDailyArchiving() {
    await this.archiveOverdueTasks();
  }
}
