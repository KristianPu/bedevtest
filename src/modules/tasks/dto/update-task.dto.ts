import { PartialType, PickType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNotEmpty } from 'class-validator';

import { TaskStatus } from '../enum/task-status.enum';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(
  PickType(CreateTaskDto, ['category', 'status'] as const),
) {
  @IsOptional()
  @IsEnum(TaskStatus, {
    message:
      'Status must be one of the following: PENDING, IN_PROGRESS, COMPLETED or ARCHIVED',
  })
  @IsNotEmpty()
  @ApiProperty()
  status?: TaskStatus;
}
