import { whatsappApi } from "../config/whatsappApi";
import { WhatsAppMessage } from "../types/whatsapp";

// serviço de envio da mensagem pelo whatsapp
export class WhatsappService {

  static mountMessage(to: string, text: string): WhatsAppMessage {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    };
  }

  static mountItemChoiceMessage(to: string, text: string): WhatsAppMessage {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text,
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'pizza-id',
                title: 'Pizza'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'fogazza-id',
                title: 'Fogazza'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'pizzafogazza-id',
                title: 'Pizza e Fogazza'
              }
            }
          ]
        }
      }
    };
  }

  static mountQuantityMessage(to: string, text: string, idItem: { button_reply: { id: string; }; }, pizzaQuantity: string, fogazzaQuantity: string): WhatsAppMessage {

    const message = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: "Selecione as quantidades"
        },
        body: {
          text,
        },
        footer: {
          text: "Escolha uma das opções abaixo"
        },
        action: {
          button: "Ver opções",
          sections: [] as { title: string; rows: { id: string; title: string; }[]; }[]
        }
      }
    };

    if (!pizzaQuantity) {
      if (idItem.button_reply.id.toUpperCase() === "PIZZA-ID" || idItem.button_reply.id.toUpperCase() === "PIZZAFOGAZZA-ID") {
        message.interactive.action.sections.push({
          title: "Pizza",
          rows: [
            { id: "pizza_1", title: "1 Pizza" },
            { id: "pizza_2", title: "2 Pizzas" },
            { id: "pizza_3", title: "3 Pizzas" },
            { id: "pizza_4", title: "4 Pizzas" },
            { id: "pizza_5", title: "5 Pizzas" }
          ]
        });
      }
      return message;
    }
    if (!fogazzaQuantity) {
      if (idItem.button_reply.id.toUpperCase() === "FOGAZZA-ID" || idItem.button_reply.id.toUpperCase() === "PIZZAFOGAZZA-ID") {
        message.interactive.action.sections.push({
          title: "Fogazza",
          rows: [
            { id: "fogazza_1", title: "1 Fogazza" },
            { id: "fogazza_2", title: "2 Fogazzas" },
            { id: "fogazza_3", title: "3 Fogazzas" },
            { id: "fogazza_4", title: "4 Fogazzas" },
            { id: "fogazza_5", title: "5 Fogazzas" }]
        });
      }
      return message;
    }
    return message;
  }

  static async sendMessage(payload: WhatsAppMessage): Promise<void> {
    try {

      console.log("Whatsapp url ", process.env.WHATSAPP_API_URL);

      const response = await whatsappApi.post('/messages', payload);
      console.log("Mensagem enviada: ", response.data);

    } catch (error: any) {
      console.error('Erro ao enviar a mensagem: ', error.response?.data || error.message);
      throw new Error('Ocorreu algum erro ao enviar a mensagem.');
    }
  }
}