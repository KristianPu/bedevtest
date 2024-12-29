import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

import { Task } from './entities/task.entity';
import { SearchTaskDto } from './dto/search-task.dto';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from './enum/task-status.enum';

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}
describe('TasksService', () => {
  let tasksService: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let reminderQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const mockTaskRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
        execute: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getQueueToken('reminders'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    tasksService = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    reminderQueue = module.get(getQueueToken('reminders'));
  });

  describe('TasksService - create', () => {
    it('should throw an error if a task with the same title exists', async () => {
      const mockTask = { id: 1, title: 'Task 1', userId: 'user-123' };
      taskRepository.findOne = jest.fn().mockResolvedValueOnce(mockTask);

      const createTaskDto: CreateTaskDto = {
        title: 'Task 1',
        deadline: new Date('2024-12-31'),
        reminder: new Date('2024-12-30'),
      };

      await expect(
        tasksService.create(createTaskDto, 'user-123', 'user@example.com'),
      ).rejects.toThrow('Task with title Task 1 already exists');
    });

    it('should throw an error if the reminder is after the deadline', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Task 2',
        deadline: new Date('2024-12-31'),
        reminder: new Date('2025-01-01'),
      };

      await expect(
        tasksService.create(createTaskDto, 'user-123', 'user@example.com'),
      ).rejects.toThrow('Reminder date cannot be after the deadline date');
    });

    it('should throw an error if the reminder is in the past', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Task 3',
        deadline: new Date('2024-12-31'),
        reminder: new Date('2023-01-01'),
      };

      await expect(
        tasksService.create(createTaskDto, 'user-123', 'user@example.com'),
      ).rejects.toThrow('Reminder date cannot be in the past');
    });

    it('should create a task with a reminder', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Task 4',
        deadline: new Date('2024-12-31'),
        reminder: new Date('2024-12-30'),
      };
      taskRepository.findOne = jest.fn().mockResolvedValueOnce(null);
      taskRepository.create = jest
        .fn()
        .mockReturnValue({ ...createTaskDto, userId: 'user-123' });
      taskRepository.save = jest
        .fn()
        .mockResolvedValue({ id: 1, ...createTaskDto, userId: 'user-123' });
      reminderQueue.add = jest.fn().mockResolvedValueOnce(true);

      const result = await tasksService.create(
        createTaskDto,
        'user-123',
        'user@example.com',
      );

      expect(taskRepository.save).toHaveBeenCalledWith({
        ...createTaskDto,
        userId: 'user-123',
      });
      expect(reminderQueue.add).toHaveBeenCalledWith(
        { email: 'user@example.com', taskId: 1, title: 'Task 4' },
        expect.any(Object),
      );
      expect(result).toEqual({ id: 1, ...createTaskDto, userId: 'user-123' });
    });

    it('should create a task without a reminder', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Task 5',
        deadline: new Date('2024-12-31'),
      };
      taskRepository.findOne = jest.fn().mockResolvedValueOnce(null);
      taskRepository.create = jest
        .fn()
        .mockReturnValue({ ...createTaskDto, userId: 'user-123' });
      taskRepository.save = jest
        .fn()
        .mockResolvedValue({ id: 2, ...createTaskDto, userId: 'user-123' });

      const result = await tasksService.create(
        createTaskDto,
        'user-123',
        'user@example.com',
      );

      expect(taskRepository.save).toHaveBeenCalledWith({
        ...createTaskDto,
        userId: 'user-123',
      });
      expect(reminderQueue.add).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 2, ...createTaskDto, userId: 'user-123' });
    });
  });

  describe('TasksService - update', () => {
    it('should throw an error if the task does not exist', async () => {
      taskRepository.findOne = jest.fn().mockResolvedValueOnce(null);

      const updateTaskDto: UpdateTaskDto = { status: TaskStatus.COMPLETED };

      await expect(tasksService.update(1, updateTaskDto)).rejects.toThrow(
        'Task with id 1 not found',
      );
    });

    it('should update the task status', async () => {
      const mockTask = { id: 1, status: TaskStatus.PENDING };
      taskRepository.findOne = jest.fn().mockResolvedValueOnce(mockTask);
      taskRepository.save = jest.fn().mockResolvedValue({
        id: 1,
        status: TaskStatus.COMPLETED,
      });

      const updateTaskDto: UpdateTaskDto = { status: TaskStatus.COMPLETED };

      const result = await tasksService.update(1, updateTaskDto);

      expect(taskRepository.save).toHaveBeenCalledWith({
        ...mockTask,
        status: TaskStatus.COMPLETED,
      });
      expect(result).toEqual({
        ...mockTask,
        status: TaskStatus.COMPLETED,
      });
    });

    it('should update the task category', async () => {
      const mockTask = { id: 1, category: 'Work' };
      taskRepository.findOne = jest.fn().mockResolvedValueOnce(mockTask);
      taskRepository.save = jest.fn().mockResolvedValue({
        id: 1,
        category: 'Personal',
      });

      const updateTaskDto: UpdateTaskDto = { category: 'Personal' };

      const result = await tasksService.update(1, updateTaskDto);

      expect(taskRepository.save).toHaveBeenCalledWith({
        ...mockTask,
        category: 'Personal',
      });
      expect(result).toEqual({
        ...mockTask,
        category: 'Personal',
      });
    });
  });

  describe('TasksService - findAll', () => {
    let taskRepository: Repository<Task>;

    const whereMock = jest.fn().mockReturnThis();
    const andWhereMock = jest.fn().mockReturnThis();
    const orderByMock = jest.fn().mockReturnThis();
    const skipMock = jest.fn().mockReturnThis();
    const takeMock = jest.fn().mockReturnThis();
    const getManyAndCountMock = jest.fn();

    const mockTaskRepository = {
      createQueryBuilder: jest.fn(() => ({
        where: whereMock,
        andWhere: andWhereMock,
        orderBy: orderByMock,
        skip: skipMock,
        take: takeMock,
        getManyAndCount: getManyAndCountMock,
      })),
    };

    const mockUserId = 'user-123';
    const mockTasks = [
      { id: 1, title: 'Task 1', deadline: '2024-12-01T00:00:00Z' },
      { id: 2, title: 'Task 2', deadline: '2024-12-15T00:00:00Z' },
    ];

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TasksService,
          {
            provide: getRepositoryToken(Task),
            useValue: mockTaskRepository,
          },
          {
            provide: getQueueToken('reminders'),
            useValue: {
              add: jest.fn(),
            },
          },
        ],
      }).compile();

      tasksService = module.get<TasksService>(TasksService);
      taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    });

    it('should return all tasks without filtering by deadline', async () => {
      const searchTaskDto: SearchTaskDto = {
        page: 1,
        limit: 10,
        sort: 'title',
        order: Order.ASC,
      };

      mockTaskRepository
        .createQueryBuilder()
        .getManyAndCount.mockResolvedValueOnce([mockTasks, mockTasks.length]);

      const result = await tasksService.findAll(searchTaskDto, mockUserId);

      expect(mockTaskRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockTasks,
        itemCount: mockTasks.length,
        page: 1,
        totalPages: 1,
      });
    });

    it('should filter tasks by deadlineFrom only', async () => {
      const searchTaskDto: SearchTaskDto = {
        deadlineFrom: new Date('2024-12-01T00:00:00Z'),
        page: 1,
        limit: 10,
        sort: 'title',
        order: Order.ASC,
      };

      mockTaskRepository
        .createQueryBuilder()
        .getManyAndCount.mockResolvedValueOnce([mockTasks, mockTasks.length]);

      const result = await tasksService.findAll(searchTaskDto, mockUserId);

      expect(
        mockTaskRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('task.deadline >= :deadlineFrom', {
        deadlineFrom: new Date('2024-12-01T00:00:00Z'),
      });
      expect(result).toEqual({
        data: mockTasks,
        itemCount: mockTasks.length,
        page: 1,
        totalPages: 1,
      });
    });

    it('should filter tasks by deadlineTo only', async () => {
      const searchTaskDto: SearchTaskDto = {
        deadlineTo: new Date('2024-12-31T00:00:00Z'),
        page: 1,
        limit: 10,
        sort: 'title',
        order: Order.ASC,
      };

      mockTaskRepository
        .createQueryBuilder()
        .getManyAndCount.mockResolvedValueOnce([mockTasks, mockTasks.length]);

      const result = await tasksService.findAll(searchTaskDto, mockUserId);

      expect(
        mockTaskRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('task.deadline <= :deadlineTo', {
        deadlineTo: new Date('2024-12-31T00:00:00Z'),
      });
      expect(result).toEqual({
        data: mockTasks,
        itemCount: mockTasks.length,
        page: 1,
        totalPages: 1,
      });
    });

    it('should filter tasks by both deadlineFrom and deadlineTo', async () => {
      const searchTaskDto: SearchTaskDto = {
        deadlineFrom: new Date('2024-12-01T00:00:00Z'),
        deadlineTo: new Date('2024-12-31T00:00:00Z'),
        page: 1,
        limit: 10,
        sort: 'title',
        order: Order.ASC,
      };

      const mockTasks = [
        { id: 1, title: 'Task 1', deadline: new Date('2024-12-15T00:00:00Z') },
        { id: 2, title: 'Task 2', deadline: new Date('2024-12-20T00:00:00Z') },
      ];

      mockTaskRepository
        .createQueryBuilder()
        .getManyAndCount.mockResolvedValueOnce([mockTasks, mockTasks.length]);

      const result = await tasksService.findAll(searchTaskDto, 'user-123');

      expect(andWhereMock).toHaveBeenCalledWith(
        'task.deadline BETWEEN :deadlineFrom AND :deadlineTo',
        expect.objectContaining({
          deadlineFrom: new Date('2024-12-01T00:00:00Z'),
          deadlineTo: new Date('2024-12-31T00:00:00Z'),
        }),
      );

      expect(result).toEqual({
        data: mockTasks,
        itemCount: mockTasks.length,
        page: 1,
        totalPages: 1,
      });
    });
  });
  describe('TasksService - archiveOverdueTasks', () => {
    it('should archive overdue tasks and log the count', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValueOnce({ affected: 3 }),
      };
      taskRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      await tasksService.archiveOverdueTasks();

      expect(taskRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Task);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        status: TaskStatus.ARCHIVED,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(status IN (:...statuses) AND deadline < :overdueDate) OR status = :completedStatus',
        {
          statuses: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
          completedStatus: TaskStatus.COMPLETED,
          overdueDate: expect.any(Date),
        },
      );
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Archived 3 tasks');

      consoleLogSpy.mockRestore();
    });
  });
});
