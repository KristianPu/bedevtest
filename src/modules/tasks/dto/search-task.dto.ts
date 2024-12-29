import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { Task } from '../entities/task.entity';

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export const allowedSortProps: (keyof Task)[] = [
  'title',
  'summary',
  'category',
  'status',
  'deadline',
  'reminder',
];

export class SearchTaskDto {
  @IsOptional()
  @IsNotEmpty()
  @IsDateString()
  @ApiProperty({
    required: false,
  })
  readonly deadlineFrom?: Date;

  @IsOptional()
  @IsNotEmpty()
  @IsDateString()
  @ApiProperty({
    required: false,
  })
  readonly deadlineTo?: Date;

  @IsEnum(Order)
  @IsOptional()
  @ApiProperty({
    enum: Order,
    required: false,
    default: Order.ASC,
  })
  readonly order?: Order = Order.ASC;

  @IsEnum(allowedSortProps)
  @IsOptional()
  @ApiProperty({
    enum: allowedSortProps,
    required: false,
  })
  readonly sort?: keyof Task = 'title';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  @ApiProperty({
    required: false,
    minimum: 1,
    default: 1,
  })
  readonly page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  readonly limit?: number = 10;
}
