import Redis from 'ioredis';
import redisClient from '../../middlewares/redisClient';

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      on: (event: string, callback: (err?: Error) => void) => {
        if (event === 'connect') {
          callback();
        } else if (event === 'error') {
          const error = new Error('Test error');
          callback(error);
        }
      },
      emit: jest.fn(),
    })),
  };
});

describe('Redis Client', () => {
  it('should create a Redis instance with correct config', () => {
    expect(Redis).toHaveBeenCalledWith({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });
  });

  it('should handle connect event', () => {
    const connectCallback = jest.fn();
    redisClient.on('connect', connectCallback);
    redisClient.emit('connect');
    expect(connectCallback).toHaveBeenCalled();
  });

  it('should handle error event', () => {
    const errorCallback = jest.fn();
    redisClient.on('error', errorCallback);
    const error = new Error('Test error');
    redisClient.emit('error', error);
    expect(errorCallback).toHaveBeenCalledWith(error);
  });
});