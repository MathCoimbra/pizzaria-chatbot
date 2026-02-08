import axios from 'axios';

jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn()
    }))
  };
});

describe('Whatsapp Api Connection', () => {
  it('should connect with whatsapp api', () => {
    process.env.WHATSAPP_API_URL = 'https://fake.api';
    process.env.WHATSAPP_ACCESS_TOKEN = 'token123';

    const { whatsappApi } = require('../../middlewares/whatsappApi');

    whatsappApi.get('/test-endpoint');

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://fake.api',
      headers: {
        Authorization: 'Bearer token123',
        'Content-Type': 'application/json'
      }
    });
  });
});