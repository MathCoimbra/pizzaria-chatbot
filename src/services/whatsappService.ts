import redisClient from "../../utils/redisClient";
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

  static async mountQuantityMessage(to: string, text: string): Promise<WhatsAppMessage> {

    const userStateKey = `user${to}:state`;
    const userState = await redisClient.get(userStateKey);

    const message = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: "Selecione a quantidade"
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


    if (userState) {
      const userStateJson: { step: string} = JSON.parse(userState);
      if (userStateJson.step.toUpperCase() === "PIZZA_QUANTITY") {
        message.interactive.action.sections.push({
          title: "Pizza",
          rows: [
            { id: "pizza_1", title: "1" },
            { id: "pizza_2", title: "2" },
            { id: "pizza_3", title: "3" },
            { id: "pizza_4", title: "4" },
            { id: "pizza_5", title: "5" }
          ]
        });
        await redisClient.set(userStateKey, JSON.stringify({ "step": "FLAVOR_SPLIT" }), 'EX', 86400);
        return message;
      }
      if (userStateJson.step.toUpperCase() === "FOGAZZA_QUANTITY") {
        message.interactive.action.sections.push({
          title: "Fogazza",
          rows: [
            { id: "fogazza_1", title: "1" },
            { id: "fogazza_2", title: "2" },
            { id: "fogazza_3", title: "3" },
            { id: "fogazza_4", title: "4" },
            { id: "fogazza_5", title: "5" }]
        });
        return message;
      }
      if (userStateJson.step.toUpperCase() === "PF_PIZZA_QUANTITY") {
        message.interactive.action.sections.push({
          title: "Pizza",
          rows: [
            { id: "pizza_1", title: "1" },
            { id: "pizza_2", title: "2" },
            { id: "pizza_3", title: "3" },
            { id: "pizza_4", title: "4" },
            { id: "pizza_5", title: "5" }
          ]
        });
        return message;
      }
      if (userStateJson.step.toUpperCase() === "PF_FOGAZZA_QUANTITY") {
        message.interactive.action.sections.push({
          title: "Fogazza",
          rows: [
            { id: "fogazza_1", title: "1" },
            { id: "fogazza_2", title: "2" },
            { id: "fogazza_3", title: "3" },
            { id: "fogazza_4", title: "4" },
            { id: "fogazza_5", title: "5" }]
        });
        await redisClient.set(userStateKey, JSON.stringify({ "step": "FLAVOR_SPLIT" }), 'EX', 86400);
        return message;
      }
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