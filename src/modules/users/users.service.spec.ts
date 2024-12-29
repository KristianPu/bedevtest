import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';

import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let usersService: UsersService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    usersService = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
  });

  describe('register', () => {
    it('should throw an error if user already exists', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(
        usersService.register({ email: 'test@example.com', password: '12345' }),
      ).rejects.toThrow(
        new BadRequestException(
          'User with email test@example.com already exists',
        ),
      );
    });

    it('should create a new user and hash the password', async () => {
      const createUserDto = { email: 'test@example.com', password: '12345' };
      const salt = 10;

      mockUserRepository.findOne.mockResolvedValueOnce(null);
      mockUserRepository.create.mockReturnValueOnce(mockUser);
      mockUserRepository.save.mockResolvedValueOnce(mockUser);
      mockConfigService.get.mockReturnValueOnce(salt);
      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValueOnce('hashedpassword' as never);

      const result = await usersService.register(createUserDto);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashedpassword',
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ id: 1, email: 'test@example.com' });
    });
  });

  describe('login', () => {
    it('should throw an error if user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        usersService.login({ email: 'test@example.com', password: '12345' }),
      ).rejects.toThrow(
        new BadRequestException('User with email test@example.com not found'),
      );
    });

    it('should throw an error if password is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

      await expect(
        usersService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(new BadRequestException('Invalid password'));
    });

    // it('should return a token if credentials are valid', async () => {
    //   mockUserRepository.findOne.mockResolvedValueOnce(mockUser);
    //   const result = jest
    //     .spyOn(bcrypt, 'compare')
    //     .mockResolvedValueOnce(true as never);
    //   mockJwtService.sign.mockReturnValueOnce('test-token');

    //   await usersService.login({
    //     email: 'test@example.com',
    //     password: '12345',
    //   });

    //   expect(mockJwtService.sign).toHaveBeenCalledWith({
    //     id: mockUser.id,
    //     username: mockUser.email,
    //   });
    //   expect(result).toEqual({ token: 'test-token' });
    // });
    it('should return a token if credentials are valid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never); // Mock valid password

      const loginDto = { email: 'test@example.com', password: 'password123' };
      const result = await usersService.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        id: mockUser.id,
        username: mockUser.email,
      });
      expect(result).toEqual({ token: 'test-token' });
    });
  });
});
