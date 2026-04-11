import { findBestMatch } from "../../../utils/stringSimilarity";
import redisClient from "../../middlewares/redisClient";
import { whatsappApi } from "../../middlewares/whatsappApi";
import { ChatbotService } from "../../services/chatbotService";
import { WhatsappService } from "../../services/whatsappService";

jest.mock('../../middlewares/redisClient', () => ({
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

describe('ChatbotService', () => {

  describe('processMessage', () => {

    jest.spyOn(whatsappApi, "post").mockResolvedValue({ data: "ok" });

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      sendStatus: jest.fn(),
    } as any;


    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should ignore event when body structure is invalid", async () => {
      const body: any = undefined;

      await ChatbotService.processMessage(body, res);

      expect(redisClient.get).not.toHaveBeenCalled();
    });

    it("should ignore event when text structure is invalid", async () => {
      const body: any = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: "123",
                      from: "5511888888888",
                      text: undefined
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await ChatbotService.processMessage(body, res);

      expect(redisClient.get).toHaveBeenCalledWith("user5511888888888:state");

    });

    it("should ignore message sent by the bot itself", async () => {
      process.env.BOT_NUMBER = "5511888888888";

      const body: any = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: "123",
                      from: "5511888888888",
                      text: { body: "Oi" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await ChatbotService.processMessage(body, res);

      expect(res.sendStatus).toHaveBeenCalledWith(200);
      expect(redisClient.get).not.toHaveBeenCalled();
    });

    it("should send welcome message on first interaction", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (redisClient.set as jest.Mock).mockResolvedValue(null);

      jest.spyOn(WhatsappService, "getWelcomeMessage").mockReturnValue(
        "Mensagem de boas-vindas" as any
      );

      jest.spyOn(WhatsappService, "mountItemChoiceMessage").mockReturnValue(
        "Pizza, Fogazza ou Ambos?" as any
      );

      const body: any = {
        entry: [
          {
            changes: [
              {
                value: {
                  contacts: [
                    {
                      profile: { name: "João" },
                    },
                  ],
                  messages: [
                    {
                      id: "123",
                      from: "5511999999999",
                      text: { body: "Oi" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await ChatbotService.processMessage(body, res);

      expect(redisClient.get).toHaveBeenCalledWith("user5511999999999:state");
      expect(redisClient.set).toHaveBeenCalledWith(
        "user5511999999999:state",
        JSON.stringify({ step: "CHOOSE_ITEM" }),
        "EX",
        86400
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        "Mensagem de boas-vindas enviada com sucesso!"
      );
    });

    it("should handle existing user state", async () => {
      const handleSpy = jest
        .spyOn(ChatbotService as any, "handleUserState")
        .mockResolvedValue(undefined);

      (redisClient.get as jest.Mock)
        .mockResolvedValueOnce(null) // msg not already processed
        .mockResolvedValueOnce(JSON.stringify({ step: "CHOOSE_ITEM" })); // user state exists

      const body: any = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: "123",
                      from: "5511999999999",
                      text: { body: "Calabresa" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await ChatbotService.processMessage(body, res);

      expect(handleSpy).toHaveBeenCalledWith(
        "5511999999999",
        undefined,
        res,
        "Calabresa"
      );
    });

    it("should throw error on welcome message failure", async () => {

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const fakeError = {
        response: {
          data: "API failure message"
        },
        message: "Fallback message"
      };

      (redisClient.get as jest.Mock).mockRejectedValue(fakeError);

      const body: any = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: "123",
                      from: "5511999999999",
                      text: { body: "Oi" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await expect(
        ChatbotService.processMessage(body, res)
      ).rejects.toThrow("Ocorreu algum erro ao enviar a mensagem.");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Erro ao enviar a mensagem: ",
        "API failure message"
      );

      consoleSpy.mockRestore();
    });

    it("should throw error on welcome message failure without response", async () => {

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const fakeError = new Error("Generic failure");

      (redisClient.get as jest.Mock).mockRejectedValue(fakeError);

      const body: any = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: "123",
                      from: "5511999999999",
                      text: { body: "Oi" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await expect(
        ChatbotService.processMessage(body, res)
      ).rejects.toThrow("Ocorreu algum erro ao enviar a mensagem.");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Erro ao enviar a mensagem: ",
        "Generic failure"
      );

      consoleSpy.mockRestore();
    });

  });

  describe('handleItemSelection', () => {

    let idItem;
    let userText;

    it('should save PIZZA_MENU state when user types Pizza', async () => {

      idItem = undefined;
      userText = 'Pizza';

      await ChatbotService.handleItemSelection(idItem as any, userText, { step: "CHOOSE_ITEM" } as any, 'user5511888888888:state');

      expect(redisClient.set).toHaveBeenCalledWith(
        "user5511888888888:state",
        JSON.stringify({ step: "PIZZA_MENU" }),
        "EX",
        86400
      );

    });

    it('should save PIZZA_MENU state when user selects Pizza', async () => {

      idItem = 'pizza-id';
      userText = undefined as any;

      await ChatbotService.handleItemSelection(idItem, userText, { step: "CHOOSE_ITEM" } as any, 'user5511888888888:state');

      expect(redisClient.set).toHaveBeenCalledWith(
        "user5511888888888:state",
        JSON.stringify({ step: "PIZZA_MENU" }),
        "EX",
        86400
      );

    });

    it('should throw error when user does not select or type a valid item', async () => {

      idItem = undefined as any;
      userText = undefined as any;
      ;

      expect(ChatbotService.handleItemSelection(idItem, userText, { step: "CHOOSE_ITEM" } as any, 'user5511888888888:state')).rejects.toThrow('Não consegui entender sua escolha, por favor selecione uma das opções ou digite novamente 🙂');

    });

    it('should save FOGAZZA_MENU state when user types Fogazza', async () => {

      idItem = undefined;
      userText = 'Fogazza';

      await ChatbotService.handleItemSelection(idItem as any, userText, { step: "CHOOSE_ITEM" } as any, 'user5511888888888:state');

      expect(redisClient.set).toHaveBeenCalledWith(
        "user5511888888888:state",
        JSON.stringify({ step: "FOGAZZA_MENU" }),
        "EX",
        86400
      );

    });

    it('should save FOGAZZA_MENU state when user selects Fogazza', async () => {

      idItem = 'fogazza-id';
      userText = undefined as any;

      await ChatbotService.handleItemSelection(idItem, userText, { step: "CHOOSE_ITEM" } as any, 'user5511888888888:state');

      expect(redisClient.set).toHaveBeenCalledWith(
        "user5511888888888:state",
        JSON.stringify({ step: "FOGAZZA_MENU" }),
        "EX",
        86400
      );

    });

    xit('should save PF_PIZZA_MENU state when user types Pizza and Fogazza', async () => {

      idItem = undefined;
      userText = 'Pizza e Fogazza';

      await ChatbotService.handleItemSelection(idItem as any, userText, { step: "CHOOSE_ITEM" } as any, 'user5511888888888:state');

      expect(redisClient.set).toHaveBeenCalledWith(
        "user5511888888888:state",
        JSON.stringify({ step: "PF_PIZZA_MENU" }),
        "EX",
        86400
      );

    });

    xit('should save PF_PIZZA_MENU state when user selects Pizza and Fogazza', async () => {

      idItem = 'pizzafogazza-id';
      userText = undefined as any;

      await ChatbotService.handleItemSelection(idItem, userText, { step: "CHOOSE_ITEM" } as any, 'user5511888888888:state');

      expect(redisClient.set).toHaveBeenCalledWith(
        "user5511888888888:state",
        JSON.stringify({ step: "PF_PIZZA_MENU" }),
        "EX",
        86400
      );

    });

    xit('should save PF_FOGAZZA_MENU state when user selects Pizza then Fogazza', async () => {

      idItem = 'pizzafogazza-id';
      userText = undefined as any;

      await ChatbotService.handleItemSelection(idItem, userText, { step: "PF_PIZZA_MENU" } as any, 'user5511888888888:state');

      expect(redisClient.set).toHaveBeenCalledWith(
        "user5511888888888:state",
        JSON.stringify({ step: "PF_FOGAZZA_MENU" }),
        "EX",
        86400
      );

    });

    xit('should throw error when Redis fails to save state', async () => {

      idItem = 'pizzafogazza-id';
      userText = undefined as any;

      (redisClient.set as jest.Mock).mockRejectedValue(new Error("Redis failure"));

      expect(ChatbotService.handleItemSelection(idItem, userText, { step: "CHOOSE_ITEM" } as any, 'user5511888888888:state')).rejects.toThrow('Houve um problema no processamento da sua solicitação, por favor selecione uma das opções ou digite novamente 🙂');


    });

  });

});