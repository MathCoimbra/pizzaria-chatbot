import { verifyWebhook } from "../../src/controllers/webhookController";

describe('Webhook Controller', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = {
      query
        : {
        'hub.mode': 'subscribe',
        'hub.verify_token': "test_verify_token",
        'hub.challenge': '12345'
      }
    },

      mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        sendStatus: jest.fn()
      };

    jest.clearAllMocks();
  });

  jest.spyOn(require("../../src/controllers/webhookController"), 'verifyWebhook');

  it('should return a correct token', () => {

    process.env.VERIFY_TOKEN = 'test_verify_token';

    verifyWebhook(mockReq, mockRes);

    expect(verifyWebhook).toHaveBeenCalledWith(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith('12345');
  });

  it('should return 403 error', () => {

    process.env.VERIFY_TOKEN = 'wrong_token';

    verifyWebhook(mockReq, mockRes);

    expect(verifyWebhook).toHaveBeenCalledWith(mockReq, mockRes);
    expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
  });
});
