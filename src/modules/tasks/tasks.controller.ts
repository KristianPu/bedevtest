import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthGuard } from '../../guards/auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { SearchTaskDto } from './dto/search-task.dto';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string,
  ) {
    return this.tasksService.create(createTaskDto, userId, email);
  }

  @Get()
  async findAll(
    @Query() searchTaskDto: SearchTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return await this.tasksService.findAll(searchTaskDto, userId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return await this.tasksService.update(+id, updateTaskDto);
  }
}
