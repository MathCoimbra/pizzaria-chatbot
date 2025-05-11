import redisClient from "../../utils/redisClient";
import { findBestMatch } from "../../utils/stringSimilarity";
import { whatsappApi } from "../config/whatsappApi";
import { Order } from "../types/order";
import { UserState } from "../types/userState";
import { WhatsAppMessage } from "../types/whatsapp";

// serviço de envio da mensagem pelo whatsapp
export class WhatsappService {

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

  // TO DO: mudar posteriormente esses métodos para que pegue as imagens do cardápio

  static getPizzaMenuMessage(): string {
    const pizza = this.getPizza();
    const pizzaMenu = pizza.map((item, index) => `${index + 1} - ${item}`).join('\n');
    return `🍕 *Cardápio de Pizzas:*\n\n${pizzaMenu}`;
  }

  static getFogazzaMenuMessage(): string {
    const fogazza = this.getFogazza();
    const fogazzaMenu = fogazza.map((item, index) => `${index + 1} - ${item}`).join('\n');
    return `🥟 *Cardápio de Fogazzas:*\n\n${fogazzaMenu}`;
  }

  static async mountMenuMessage(to: string): Promise<WhatsAppMessage> {

    const message = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: "Não entendi qual é o seu pedido 🤔 Poderia repetir por favor? 🙂"
      }
    };

    const userStateKey = `user${to}:state`;
    const userState = await redisClient.get(userStateKey);

    if (userState) {
      const userStateJson: UserState = JSON.parse(userState);
      if (userStateJson.step.toUpperCase() === "PIZZA_MENU" || userStateJson.step.toUpperCase() === "PF_PIZZA_MENU") {
        message.text.body = this.getPizzaMenuMessage();
        return message;
      }
      if (userStateJson.step.toUpperCase() === "FOGAZZA_MENU" || userStateJson.step.toUpperCase() === "PF_FOGAZZA_MENU") {
        message.text.body = this.getFogazzaMenuMessage();
        return message;
      }
    }

    return message;
  }

  static getWelcomeMessage(name: string): string {
    return `🧑‍🍳 Olá *${name}*!\n\n🍕 Bem vindo a pizzaria *Sabores do Chef*!\n📍 Por enquanto, atendemos apenas no bairro Pedreira e região.\n\n😋 O que deseja hoje?`;
  }

  static getPizza(): Array<string> {
    return [
      "A Moda do Chefe",
      "A Moda do Cliente",
      "Atum",
      "Atumpiry",
      "Atumrela",
      "Bacon",
      "Baiacatu",
      "Baiana",
      "Bauru",
      "Brócolis II",
      "Caipira",
      "Calabresa",
      "Calabresa c/ Barbecue",
      "Carne Seca",
      "Catupiry",
      "Frango a 2 Queijos",
      "Frango a 3 Queijos",
      "Frango c/ Catupiry",
      "Lombo I",
      "Lombo II",
      "Marguerita",
      "Milho Verde",
      "Mussarela",
      "Palmito",
      "Paulista",
      "Pepperoni",
      "Pernil",
      "Portuguesa",
      "Quatro Queijos",
      "Temaki",
      "Toscana",
      "Brigadeiro",
      "Chocolate c/ Banana",
      "Chocolate c/ Morango",
      "Chocolate c/ Uva",
      "Dois Amores",
      "Nutella c/ Banana",
      "Nutella c/ Morango",
      "Nutella c/ Uva",
      "Oreo",
      "Prestígio",
      "Romeu e Julieta"
    ];
  }

  static getFogazza(): Array<string> {
    return [
      "A Moda do Chefe",
      "À Moda do Cliente",
      "Atum",
      "Atumpiry",
      "Atumrela",
      "Bacon",
      "Baiacatu",
      "Baiana",
      "Bauru",
      "Brócolis II",
      "Caipira",
      "Calabresa",
      "Calabresa c/ Barbecue",
      "Carne Seca",
      "Catupiry",
      "Frango a 2 Queijos",
      "Frango a 3 Queijos",
      "Frango c/ Catupiry",
      "Lombo I",
      "Lombo II",
      "Marguerita",
      "Milho Verde",
      "Mussarela",
      "Palmito",
      "Paulista",
      "Pepperoni",
      "Pernil",
      "Portuguesa",
      "Quatro Queijos",
      "Temaki",
      "Toscana"
    ];
  }

  static getExtra(): Array<string> {
    return [
      "Catupiry",
      "Cheddar",
      "Mussarela",
      "Cream Cheese",
      "Chocolate",
      "coca_cola",
      "fanta_laranja",
      "fanta_uva",
      "sukita_laranja",
      "sukita_uva",
      "dolly_guarana",
      "dolly_laranja",
      "dolly_limao",
    ];
  }

  static async getOrderMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `🧑‍🍳 Por favor, envie seu pedido em uma única mensagem de texto para que eu consiga entender tudo direitinho, caso for pizza, não esqueça de informar o tamanho (grande ou broto) 🙂 \nExemplo: Quero uma pizza grande de calabresa com borda de catupiry e uma Coca-Cola`
      }
    };
  }


  static async getFlavorSizeErrorMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `Ficou faltando informar o tamanho (grande ou broto) e/ou o sabor de um ou mais itens do pedido, por favor envie novamente o pedido completo 🙂`
      }
    };
  }

  static async getSizeErrorMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `Ficou faltando informar o sabor de um ou mais itens do pedido, por favor envie novamente o pedido completo 🙂`
      }
    };
  }

  static async getOrderValidationMessage(to: string, order: string, orderPrice: number): Promise<WhatsAppMessage> {

    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `🧑‍🍳 Pedido anotado! \n\n${order} \n\nValor: R$${orderPrice},00 \n\nConfirme com as opções abaixo:`,
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'yes-id',
                title: 'Certinho, isso mesmo'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'no-id',
                title: 'Não, tem algo errado'
              }
            }
          ]
        }
      }
    };
  }

  static async getHalfItemPrice(sabor: string[], tamanho: string): Promise<number> {
    let halfItemPrice = 0;
    let maxPrice = 0;
    for (const singleSabor of sabor) {
      const price = Number(await redisClient.hget(`pizza:${findBestMatch(singleSabor, this.getPizza())}:${tamanho}`.toLowerCase(), "preco"));
      if (price > maxPrice) {
        maxPrice = price;
      }
    }
    halfItemPrice += maxPrice;
    return halfItemPrice;
  }

  static async getOrderPrice(order: Order): Promise<number> {

    let orderPrice = 0;

    if (order.pizza && order.pizza.length !== 0) {
      for (const item of order.pizza) {
        const { sabor, tamanho, borda } = item;
        if (Array.isArray(sabor)) {
          const halfPizzaPrice = await this.getHalfItemPrice(sabor, tamanho);
          orderPrice += halfPizzaPrice;
        } else {
          orderPrice += Number(await redisClient.hget(`pizza:${findBestMatch(sabor, this.getPizza())}:${tamanho}`.toLowerCase(), "preco"));
        }
        orderPrice += Number(await redisClient.hget(`borda:${findBestMatch(borda, this.getExtra())}`.toLowerCase(), "preco"));
      }
    }

    if (order.fogazza && order.fogazza.length !== 0) {
      for (const item of order.fogazza) {
        const { sabor, borda } = item;
        orderPrice += Number(await redisClient.hget(`fogazza:${findBestMatch(sabor, this.getFogazza())}`.toLowerCase(), "preco"));
        orderPrice += Number(await redisClient.hget(`borda:${findBestMatch(borda, this.getExtra())}`.toLowerCase(), "preco"));
      }
    }

    if (order.bebida && order.bebida.length !== 0) {
      for (const item of order.bebida) {
        const { tipo } = item;
        orderPrice += Number(await redisClient.hget(`bebida:${findBestMatch(tipo, this.getExtra())}`.toLowerCase(), "preco"));
      }
    }

    return orderPrice;
  }

  static mountOrderSummaryMessage(to: string, text?: string): WhatsAppMessage {
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
                id: 'confirm-id',
                title: 'Confirmar'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'cancel-id',
                title: 'Cancelar'
              }
            }
          ]
        }
      }
    };
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