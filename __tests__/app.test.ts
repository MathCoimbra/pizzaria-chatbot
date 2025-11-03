import request from 'supertest';
import { app } from '../src/app';

jest.mock("../src/controllers/webhookController", () => ({
  verifyWebhook: jest.fn((req, res) => {
    res.status(200).send('OK');
  })
}));

jest.mock('../src/middlewares/redisClient', () => ({
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

describe('Express and routes tests', () => {
  it('should return 200 on get /webhook', async () => {
    const response = await request(app).get('/webhook');
    expect(response.status).toBe(200);
  });

  it('should return 200 on post /webhook', async () => {
    const response = await request(app).post('/webhook');
    expect(response.status).toBe(200);
  });
});
