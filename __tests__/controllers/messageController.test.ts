import { MessageController } from '../../src/controllers/messageController';
import { ChatbotService } from '../../src/services/chatbotService';

// mock do ChatbotService
jest.mock('../../src/services/chatbotService');
jest.mock('../../src/middlewares/redisClient', () => ({
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

describe('Message Controller', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = {
      body: { entry: [{ id: '123', changes: [] }] } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should return a success message', async () => {

    (ChatbotService.processMessage as jest.Mock).mockResolvedValueOnce(undefined);

    await MessageController.receiveMessage(mockReq, mockRes);

    expect(ChatbotService.processMessage).toHaveBeenCalledWith(mockReq.body, mockRes);
  });

  it('should return 500 error', async () => {
    (ChatbotService.processMessage as jest.Mock).mockRejectedValueOnce(new Error('Falha'));

    await MessageController.receiveMessage(mockReq, mockRes);

    expect(ChatbotService.processMessage).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith('Erro ao enviar a mensagem de resposta.');
  });
});
