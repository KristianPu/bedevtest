import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call UsersService.register on register', async () => {
    const registerDto = { email: 'test@example.com', password: 'password123' };
    jest.spyOn(service, 'register').mockResolvedValueOnce(registerDto as any);

    const result = await controller.register(registerDto);

    expect(service.register).toHaveBeenCalledWith(registerDto);
    expect(result).toEqual(registerDto);
  });

  it('should call UsersService.login on login', async () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };
    const mockToken = { token: 'test-token' };
    jest.spyOn(service, 'login').mockResolvedValueOnce(mockToken);

    const result = await controller.login(loginDto);

    expect(service.login).toHaveBeenCalledWith(loginDto);
    expect(result).toEqual(mockToken);
  });
});
