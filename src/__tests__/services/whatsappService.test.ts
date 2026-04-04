import { WhatsappService } from "../../services/whatsappService";
import { WhatsAppMessage } from "../../types/whatsapp";
import redisClient from "../../middlewares/redisClient";
import { whatsappApi } from "../../middlewares/whatsappApi";

jest.mock("../../middlewares/redisClient", () => ({
  get: jest.fn(),
  set: jest.fn(),
  hget: jest.fn().mockImplementation((key) => {
    const prices: any = {
      'pizza:calabresa:grande': {
        preco: 40
      },
      'pizza:mussarela:grande': {
        preco: 35
      },
      'pizza:atum:grande': {
        preco: 60
      },
      'borda:cheddar': {
        preco: 5
      },
      'fogazza:calabresa': {
        preco: 20
      },
      'bebida:coca_cola': {
        preco: 7
      },
    };
    return prices[key]?.preco;
  }),
}));

describe("WhatsappService", () => {
  const to = "5511999999999";

  describe("mountItemChoiceMessage", () => {
    it("should return a WhatsAppMessage with item choices", () => {
      const text = "Escolha um item";
      const msg: any = WhatsappService.mountItemChoiceMessage(to, text);
      expect(msg.messaging_product).toBe("whatsapp");
      expect(msg.to).toBe(to);
      expect(msg.type).toBe("interactive");
      expect(msg.interactive.body.text).toBe(text);
      expect(msg.interactive.action.buttons).toHaveLength(3);
    });
  });

  describe("getPizzaMenuMessage", () => {
    it("should return pizza menu string", () => {
      const menu = WhatsappService.getPizzaMenuMessage();
      expect(menu).toContain("🍕 *Cardápio de Pizzas:*");
      expect(menu).toContain("1 - atum");
    });
  });

  describe("getFogazzaMenuMessage", () => {
    it("should return fogazza menu string", () => {
      const menu = WhatsappService.getFogazzaMenuMessage();
      expect(menu).toContain("🥟 *Cardápio de Fogazzas:*");
      expect(menu).toContain("1 - atum");
    });
  });

  describe("mountMenuMessage", () => {
    it("should return default message if no user state", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      const msg: any = await WhatsappService.getMenuMessage(to);
      expect(msg.text.body).toContain("Não entendi qual é o seu pedido");
    });

    it("should return pizza menu if user state is PIZZA_MENU", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify({ step: "PIZZA_MENU" }));
      const msg: any = await WhatsappService.getMenuMessage(to);
      expect(msg.text.body).toContain(WhatsappService.getPizzaMenuMessage());
    });

    it("should return fogazza menu if user state is FOGAZZA_MENU", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify({ step: "FOGAZZA_MENU" }));
      const msg: any = await WhatsappService.getMenuMessage(to);
      expect(msg.text.body).toContain(WhatsappService.getFogazzaMenuMessage());
    });

    it("should return pizza menu if user state is PF_PIZZA_MENU", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify({ step: "PF_PIZZA_MENU" }));
      const msg: any = await WhatsappService.getMenuMessage(to);
      expect(msg.text.body).toContain(WhatsappService.getPizzaMenuMessage());
    });

    it("should return fogazza menu if user state is PF_FOGAZZA_MENU", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify({ step: "PF_FOGAZZA_MENU" }));
      const msg: any = await WhatsappService.getMenuMessage(to);
      expect(msg.text.body).toContain(WhatsappService.getFogazzaMenuMessage());
    });

    it("should not alter message if step is not recognized", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify({ step: "UNKNOWN_STEP" }));
      const msg: any = await WhatsappService.getMenuMessage(to);
      expect(msg.text.body).toContain("Não entendi qual é o seu pedido 🤔 Poderia repetir por favor? 🙂");
    });

  });

  describe("getWelcomeMessage", () => {
    it("should return welcome message with name", () => {
      const name = "Matheus";
      const msg: any = WhatsappService.getWelcomeMessage(name);
      expect(msg).toContain(`Olá *${name}*`);
      expect(msg).toContain("Bem vindo a pizzaria");
    });
  });

  describe("getFlavor", () => {
    it("should return array of flavors", () => {
      const flavors = WhatsappService.getFlavor();
      expect(Array.isArray(flavors)).toBe(true);
      expect(flavors).toContain("atum");
    });
  });

  describe("getExtra", () => {
    it("should return array of extras", () => {
      const extras = WhatsappService.getExtra();
      expect(Array.isArray(extras)).toBe(true);
      expect(extras).toContain("catupiry");
    });
  });

  describe("getOrderMessage", () => {
    it("should return order message", async () => {
      const msg: any = await WhatsappService.getOrderMessage(to);
      expect(msg.text.body).toContain("Por favor, envie seu pedido");
    });
  });

  describe("getOrderEditMessage", () => {
    it("should return order edit message", async () => {
      const msg: any = await WhatsappService.getOrderEditMessage(to);
      expect(msg.text.body).toContain("Por favor, envie a alteração do seu pedido");
    });
  });

  describe("getCancelMessage", () => {
    it("should return cancel message", async () => {
      const msg: any = await WhatsappService.getCancelMessage(to);
      expect(msg.text.body).toContain("Seu pedido foi cancelado");
    });
  });

  describe("getPizzeriaAddressMessage", () => {
    it("should return address message", async () => {
      process.env.PIZZERIA_ADDRESS = "Rua Teste, 123";
      const msg: any = await WhatsappService.getPizzeriaAddressMessage(to);
      expect(msg.text.body).toContain("Nossa pizzaria fica localizada na Rua Teste, 123");
    });
  });

  describe("getPaymentMethodMessage", () => {
    it("should return payment method message", async () => {
      const msg: any = await WhatsappService.getPaymentMethodMessage(to);
      expect(msg.text.body).toContain("Qual será a forma de pagamento por favor");
    });
  });

  describe("getOrderEditOrCancelMessage", () => {
    it("should return order edit or cancel message", async () => {
      process.env.PIX_NUMBER = "11999999999";
      const msg: any = await WhatsappService.getOrderEditOrCancelMessage(to);
      expect(msg.to).toBe(to);
      expect(msg.interactive.body.text).toContain("🧑‍🍳 Ok! Deseja ajustar o pedido ou cancelar");
    });
  });

  describe("getAddressMessage", () => {
    it("should return address message", async () => {
      process.env.PIX_NUMBER = "11999999999";
      const msg: any = await WhatsappService.getAddressMessage(to);
      expect(msg.to).toBe(to);
      expect(msg.text.body).toContain("🧑‍🍳 Ok! Mande o endereço completo e um ponto de refêrencia, por favor.");
    });
  });

  describe("getDeliveryValidationMessage", () => {
    it("should return delivery validation message", async () => {
      const msg: any = await WhatsappService.getDeliveryValidationMessage(to);
      expect(msg.to).toBe(to);
      expect(msg.interactive.body.text).toContain("Você gostaria de retirar no local ou prefere que entreguemos em sua casa?");
    });
  });

  describe("getFlavorSizeErrorMessage", () => {
    it("should return flavor size error message", async () => {
      const msg: any = await WhatsappService.getFlavorSizeErrorMessage(to);
      expect(msg.to).toBe(to);
      expect(msg.text.body).toContain("Ficou faltando informar o tamanho (grande ou broto) e/ou o sabor de um ou mais itens do pedido");
    });
  });

  describe("getClientFlavorErrorMessage", () => {
    it("should return client flavor error message", async () => {
      const msg: any = await WhatsappService.getClientFlavorErrorMessage(to);
      expect(msg.to).toBe(to);
      expect(msg.text.body).toContain('Desculpe, mas a pizza "A Moda do Cliente" só pode ser feita inteira');
    });
  });

  describe("getAddressValidationMessage", () => {
    it("should return address validation message", async () => {
      const msg: any = await WhatsappService.getAddressValidationMessage(to, "Avenida Teste, 123");
      expect(msg.to).toBe(to);
      expect(msg.interactive.body.text).toContain("🧑‍🍳 Ok! Confirme o endereço de entrega por favor: \n\nAvenida Teste, 123");
    });
  });

  describe("getFlavorErrorMessage", () => {
    it("should return flavor error message", async () => {
      const msg: any = await WhatsappService.getFlavorErrorMessage(to, ["atum", "chocolate"], ["queijo", "calabresa"]);
      expect(msg.to).toBe(to);
      expect(msg.text.body).toContain("Desculpe mas os seguintes ingredientes: ~atum,chocolate~, nós não temos disponíveis mais. Escolha entre os seguintes sabores abaixo e nos envie novamente o pedido completo corrigido, por favor 🙂: \n\n*queijo,calabresa* ");
    });
  });

  describe("getFlavorErrorMessage", () => {
    it("should return flavor error message", async () => {
      const msg: any = await WhatsappService.getFlavorErrorMessage(to, ["atum", "chocolate"], ["queijo", "calabresa"]);
      expect(msg.to).toBe(to);
      expect(msg.text.body).toContain("Desculpe mas os seguintes ingredientes: ~atum,chocolate~, nós não temos disponíveis mais. Escolha entre os seguintes sabores abaixo e nos envie novamente o pedido completo corrigido, por favor 🙂: \n\n*queijo,calabresa* ");
    });
  });

  describe("getSizeErrorMessage", () => {
    it("should return size error message", async () => {
      const msg: any = await WhatsappService.getSizeErrorMessage(to);
      expect(msg.to).toBe(to);
      expect(msg.text.body).toContain('Ficou faltando informar o sabor de um ou mais itens do pedido, por favor envie novamente o pedido completo 🙂');
    });
  });

  describe("getOrderValidationMessage", () => {
    it("should return order validation message", async () => {
      const msg: any = await WhatsappService.getOrderValidationMessage(to, "Pizza de calabresa grande", 45);
      expect(msg.to).toBe(to);
      expect(msg.interactive.body.text).toContain("🧑‍🍳 Pedido anotado! \n\nPizza de calabresa grande \n\nValor: R$45,00 \n\nConfirme com as opções abaixo:");
    });
  });

  describe("getSummaryMessage", () => {
    it("should return order summary message", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      const msg: any = await WhatsappService.getSummaryMessage(to, { orderPrice: 65, paymentMethod: "Pix" } as any);
      expect(msg.to).toBe(to);
      expect(msg.text.body).toContain("65.00");
    });
  });

  describe("getHalfItemPrice", () => {
    it("should return half item price", async () => {

      const price = WhatsappService.getHalfItemPrice(["calabresa", "mussarela"], "grande");
      expect(price).resolves.toBe(40);
    });

    it("should return half item price when the more expensive pizza is the second in the list - else block ", async () => {
      const price = WhatsappService.getHalfItemPrice(["mussarela", "calabresa", "atum"], "grande");
      expect(price).resolves.toBe(60);
    });
  });

  describe("getOrderPrice", () => {
    it("should return pizza price", async () => {

      (redisClient.set as jest.Mock).mockResolvedValue(null);

      const order: any = {
        pizza: [
          {
            sabor: "calabresa",
            tamanho: "grande",
            borda: "cheddar",
          },
        ],
      };

      const price = await WhatsappService.getOrderPrice(order, "", {} as any);
      expect(price).toBe(45);
    });

    it("should return half and half pizza price", async () => {

      (redisClient.set as jest.Mock).mockResolvedValue(null);

      const order: any = {
        pizza: [
          {
            sabor: ["calabresa", "atum"],
            tamanho: "grande",
            borda: "cheddar",
          },
        ],
      };

      const price = await WhatsappService.getOrderPrice(order, "", {} as any);
      expect(price).toBe(65);
    });

    it("should return fogazza price", async () => {

      (redisClient.set as jest.Mock).mockResolvedValue(null);

      const order: any = {
        fogazza: [
          {
            sabor: "calabresa",
            borda: "cheddar",
          },
        ],
      };

      const price = await WhatsappService.getOrderPrice(order, "", {} as any);
      expect(price).toBe(25);
    });

    it("should return bebida price", async () => {

      (redisClient.set as jest.Mock).mockResolvedValue(null);

      const order: any = {
        bebida: [
          {
            tipo: "coca",
          },
        ],
      };

      const price = await WhatsappService.getOrderPrice(order, "", {} as any);
      expect(price).toBe(7);
    });
  });

  describe("sendMessage", () => {
    it("should call whatsappApi.post", async () => {
      process.env.WHATSAPP_API_URL = "https://graph.facebook.com";

      jest.spyOn(whatsappApi, "post").mockResolvedValue({ data: "ok" });

      const payload: WhatsAppMessage = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: "Teste" },
      };
      await WhatsappService.sendMessage(payload);
      expect(whatsappApi.post).toHaveBeenCalledWith("/messages", payload);
    });

    it("should throw error on failure when have a error response", async () => {

      jest.spyOn(whatsappApi, "post").mockRejectedValue({ response: { data: { error: { message: "Erro ao enviar mensagem" } } } });

      const payload: WhatsAppMessage = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: "Teste" },
      };
      await expect(WhatsappService.sendMessage(payload)).rejects.toThrow("Ocorreu algum erro ao enviar a mensagem.");
    });

    it("should throw error on failure without have a error response", async () => {

      jest.spyOn(whatsappApi, "post").mockRejectedValue({});

      const payload: WhatsAppMessage = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: "Teste" },
      };
      await expect(WhatsappService.sendMessage(payload)).rejects.toThrow("Ocorreu algum erro ao enviar a mensagem.");
    });
  });
});