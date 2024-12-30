## Project setup

```redis
$ docker run -d --name redis-stack-server -p 6379:6379 redis/redis-stack-server:latest
```

```bash
$ npm install
```

```env
Notes:
  - JWT_EXPIRATION accepts miliseconds
  - SMTP_PASS should be taken from created APP password on selected google account
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
