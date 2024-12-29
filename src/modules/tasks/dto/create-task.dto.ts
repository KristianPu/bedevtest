import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

import { TaskStatus } from '../enum/task-status.enum';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  title: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  summary?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  category?: string;

  @IsOptional()
  @IsIn([TaskStatus.PENDING, TaskStatus.IN_PROGRESS], {
    message: 'Status must be one of the following: PENDING or IN_PROGRESS',
  })
  @IsNotEmpty()
  @ApiProperty()
  status?: TaskStatus;

  @IsOptional()
  @IsDateString()
  @ApiProperty()
  deadline?: Date;

  @ValidateIf((o) => o.deadline)
  @IsOptional()
  @IsDateString()
  @ApiProperty()
  reminder?: Date;
}
