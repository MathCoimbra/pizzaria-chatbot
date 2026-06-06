import redisClient from "../middlewares/redisClient";
import { findBestMatch } from "../../utils/stringSimilarity";
import { whatsappApi } from "../middlewares/whatsappApi";
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
        header: {
          type: 'image',
          image: {
            link: `${process.env.WHATSAPP_MEDIA_BASE_URL}/pizzaria_welcome.png`,
          },
        },
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
            /* {
              type: 'reply',
              reply: {
                id: 'pizzafogazza-id',
                title: 'Pizza e Fogazza'
              }
            } */
          ]
        }
      }
    };
  }

  // TO DO: mudar posteriormente esses métodos para que pegue as imagens do cardápio

  static getPizzaMenuMessage(): string {
    const pizza = this.getFlavor();
    const pizzaMenu = pizza.map((item, index) => `${index + 1} - ${item}`).join('\n');
    return `🍕 *Cardápio de Pizzas:*\n\n${pizzaMenu}`;
  }

  static getFogazzaMenuMessage(): string {
    const fogazza = this.getFlavor();
    const fogazzaMenu = fogazza.map((item, index) => `${index + 1} - ${item}`).join('\n');
    return `🥟 *Cardápio de Fogazzas:*\n\n${fogazzaMenu}`;
  }

  static async getMenuMessage(to: string): Promise<WhatsAppMessage> {

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

  static getFlavor(): Array<string> {
    return [
      "atum",
      "atumpiry",
      "atumrela",
      "baiana",
      "bacon",
      "baiacatu",
      "bauru",
      "brigadeiro",
      "brocolis_2",
      "calabresa",
      "calabresa_barbecue",
      "carne_seca",
      "caipira",
      "catupiry",
      "chocolate_banana",
      "chocolate_morango",
      "chocolate_uva",
      "dois_amores",
      "frango_3_queijos",
      "frango_catupiry",
      "frango_2_queijos",
      "lombo_1",
      "lombo_2",
      "marguerita",
      "milho_verde",
      "moda_chefe",
      "moda_cliente",
      "mussarela",
      "nutella_banana",
      "nutella_morango",
      "nutella_uva",
      "oreo",
      "palmito",
      "paulista",
      "pepperoni",
      "pernil",
      "portuguesa",
      "prestigio",
      "quatro_queijos",
      "romeu_julieta",
      "temaki",
      "toscana"
    ];
  }

  static getExtra(): Array<string> {
    return [
      "catupiry",
      "cheddar",
      "chocolate",
      "cream_cheese",
      "mussarela",
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

    let body;
    let link;
    const userStateKey = `user${to}:state`;
    const userState = await redisClient.get(userStateKey);

    const pizzaBody = `🧑‍🍳 Por favor, envie seu pedido em uma única mensagem de texto para que eu consiga entender tudo direitinho, caso for pizza, não esqueça de informar o tamanho (grande ou broto) 🙂 \nExemplo: Quero uma pizza grande de calabresa com borda de catupiry e uma Coca-Cola`;

    const fogazzaBody = `🧑‍🍳 Por favor, envie seu pedido de fogazza em uma única mensagem de texto para que eu consiga entender tudo direitinho 🙂 \nExemplo: Quero uma fogazza de frango com catupiry e uma Coca-Cola`;

    if (userState) {
      const userStateJson: UserState = JSON.parse(userState);
      body = userStateJson.step.toUpperCase() === "FOGAZZA_MENU" ? fogazzaBody : pizzaBody;
      link = userStateJson.step.toUpperCase() === "FOGAZZA_MENU" ? `${process.env.WHATSAPP_MEDIA_BASE_URL}/fogazza_menu.png` : `${process.env.WHATSAPP_MEDIA_BASE_URL}/pizza_menu.png`;
    }

    return {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link,
        caption: body,
      },
    };
  }

  static async getOrderEditMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `🧑‍🍳 Por favor, envie a alteração do seu pedido em uma única mensagem de texto para que eu consiga entender tudo direitinho 🙂`
      }
    };
  }

  static async getCancelMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `🧑‍🍳 Ok! Seu pedido foi cancelado. Caso queira fazer um novo pedido em outro momento, só me chamar 🙂`
      }
    };
  }

  static async getPizzeriaAddressMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `🧑‍🍳 Ok, nossa pizzaria fica localizada na ${process.env.PIZZERIA_ADDRESS}`
      }
    };
  }

  static async getPaymentMethodMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `🧑‍🍳 Qual será a forma de pagamento por favor, aceitamos: \n\n📱 Pix \n💳 Cartão de crédito/débito (VISA, Mastercard, Maestro e Elo) \n💵 Dinheiro`
      }
    };
  }

  static async getOrderEditOrCancelMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `🧑‍🍳 Ok! Deseja ajustar o pedido ou cancelar?`,
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'order-edit-id',
                title: 'Ajustar pedido'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'order-cancel-id',
                title: 'Cancelar pedido'
              }
            }
          ]
        }
      }
    };
  }

  static async getAddressMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `🧑‍🍳 Ok! Mande o endereço completo e um ponto de refêrencia, por favor.`
      }
    };
  }

  static async getAddressValidationMessage(to: string, userAddress: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `🧑‍🍳 Ok! Confirme o endereço de entrega por favor: \n\n${userAddress}`,
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'address-id',
                title: 'Sim, é esse mesmo'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'address-edit-id',
                title: 'Não, é outro'
              }
            }
          ]
        }
      }
    };
  }

  static async getDeliveryValidationMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `🧑‍🍳 Ótimo! Você gostaria de retirar no local ou prefere que entreguemos em sua casa? 🙂`,
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'pickup-id',
                title: 'Retirar no local'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'delivery-id',
                title: 'Entrega em casa'
              }
            }
          ]
        }
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

  static async getClientFlavorErrorMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `Desculpe, mas a pizza "A Moda do Cliente" só pode ser feita inteira, não conseguimos oferecê-la como meia-meia. Por favor, envie novamente o pedido completo 🙂`
      }
    };
  }

  static async getFlavorErrorMessage(to: string, pendentFlavors: string[], availableFlavors: string[]): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `Desculpe mas os seguintes ingredientes: ~${pendentFlavors}~, nós não temos disponíveis mais. Escolha entre os seguintes sabores abaixo e nos envie novamente o pedido completo corrigido, por favor 🙂: \n\n*${availableFlavors}* `
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

  static async getPaymentErrorMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `Não consegui identificar a forma de pagamento, por favor digite uma das seguintes opções: Cartão de crédito, Cartão de débito, Dinheiro ou Pix 🙂`
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
      const price = Number(await redisClient.hget(`pizza:${findBestMatch(singleSabor, this.getFlavor())}:${tamanho}`.toLowerCase(), "preco"));
      if (price > maxPrice) {
        maxPrice = price;
      }
    }
    halfItemPrice += maxPrice;
    return halfItemPrice;
  }

  static async getOrderPrice(order: Order, to: string): Promise<number> {

    let orderPrice = 0;
    const userStateKey = `user${to}:state`;
    const userState = await redisClient.get(userStateKey);

    if (order.pizza && order.pizza.length !== 0) {
      for (const item of order.pizza) {
        const { sabor, tamanho, borda } = item;
        if (Array.isArray(sabor)) {
          const halfPizzaPrice = await this.getHalfItemPrice(sabor, tamanho);
          orderPrice += halfPizzaPrice;
        } else {
          orderPrice += Number(await redisClient.hget(`pizza:${findBestMatch(sabor, this.getFlavor())}:${tamanho}`.toLowerCase(), "preco"));
        }
        orderPrice += Number(await redisClient.hget(`borda:${findBestMatch(borda, this.getExtra())}`.toLowerCase(), "preco"));
      }
    }

    if (order.fogazza && order.fogazza.length !== 0) {
      for (const item of order.fogazza) {
        const { sabor, borda } = item;
        orderPrice += Number(await redisClient.hget(`fogazza:${findBestMatch(sabor, this.getFlavor())}`.toLowerCase(), "preco"));
        orderPrice += Number(await redisClient.hget(`borda:${findBestMatch(borda, this.getExtra())}`.toLowerCase(), "preco"));
      }
    }

    if (order.bebida && order.bebida.length !== 0) {
      for (const item of order.bebida) {
        const { tipo } = item;
        orderPrice += Number(await redisClient.hget(`bebida:${findBestMatch(tipo, this.getExtra())}`.toLowerCase(), "preco"));
      }
    }

    if (userState) {
      const userStateJson: UserState = JSON.parse(userState);
      await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, orderPrice }), 'EX', 86400);
    }

    return orderPrice;
  }
  static async getSummaryMessage(to: string, userStateJson: UserState): Promise<WhatsAppMessage> {

    const message = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `✅ *Pedido confirmado!*

🧾 *Resumo:*
• Valor total: R$ ${userStateJson.orderPrice.toFixed(2)}
• Forma de pagamento: ${userStateJson.paymentMethod === "Pix" ? "Pix, nossa chave para pagamento é: " + process.env.PIX_NUMBER : userStateJson.paymentMethod}
• Tempo estimado de entrega: 40 minutos

Obrigado pela preferência 🍕`
      }
    };

    return message;
  }


  static async getOrderResumeMessage(to: any, userStateJson: UserState, clientName: string, number: string): Promise<WhatsAppMessage> {
    const { order, address, paymentMethod, orderPrice, step } = userStateJson;

    const isPickup = step?.toUpperCase().includes('PICKUP') || !address;

    let orderDetails = `🧾 *Novo pedido*\n\n`;

    orderDetails += `👤 *Cliente:* ${clientName}\n\n`;
    orderDetails += `📞 *Número:* ${number}\n\n`;

    if (order.pizza && order.pizza.length > 0) {
      orderDetails += `🍕 *Pizza(s):*\n`;
      order.pizza.forEach((pizza, index) => {
        const sabor = Array.isArray(pizza.sabor)
          ? pizza.sabor.join(" e ")
          : pizza.sabor;
        orderDetails += `  ${index + 1}. ${sabor} (${pizza.tamanho})\n`;
        if (pizza.borda && pizza.borda !== 'nenhuma') {
          orderDetails += `     └─ Borda: ${pizza.borda}\n`;
        }
      });
      orderDetails += `\n`;
    }

    if (order.fogazza && order.fogazza.length > 0) {
      orderDetails += `🥟 *Fogazza(s):*\n`;
      order.fogazza.forEach((fogazza, index) => {
        orderDetails += `  ${index + 1}. ${fogazza.sabor}\n`;
        if (fogazza.borda && fogazza.borda !== 'nenhuma') {
          orderDetails += `     └─ Borda: ${fogazza.borda}\n`;
        }
      });
      orderDetails += `\n`;
    }

    if (order.bebida && order.bebida.length > 0) {
      orderDetails += `🥤 *Bebida(s):*\n`;
      order.bebida.forEach((bebida, index) => {
        orderDetails += `  ${index + 1}. ${bebida.tipo}\n`;
      });
      orderDetails += `\n`;
    }

    if (order.observacoes && order.observacoes.trim() !== '') {
      orderDetails += `📝 *Observações:*\n  ${order.observacoes}\n\n`;
    }

    if (isPickup) {
      orderDetails += `🏪 Retirada no local\n\n`;
    } else {
      orderDetails += `🚗 Entrega em casa\n`;
      orderDetails += `📍 *Endereço:* ${address}\n\n`;
    }

    orderDetails += `💳 *Pagamento:* ${paymentMethod}\n`;
    orderDetails += `💰 *Valor:* R$ ${orderPrice.toFixed(2)}\n`;

    const message = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: orderDetails
      }
    };

    return message;
  }

  static async getAddressErrorMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `Parece que o endereço está incompleto ou difícil de entender. Por favor, envie o endereço completo com rua, número e referência novamente.`
      }
    };
  }

  static async getInvalidChoiceMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `Desculpe, não consegui entender sua escolha\nPor favor, selecione uma das opções disponíveis ou escreva novamente`
      }
    };
  }

  static async getErrorMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `Ocorreu um erro inesperado da nossa parte 😔 Por favor, tente novamente mais tarde ou entre em contato diretamente por esse mesmo telefone`
      }
    };
  }

  static async getOrderErrorMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `Desculpe, não consegui entender sua mensagem, pode repetir por favor?`
      }
    };
  }

  static async getContactChefMessage(to: string): Promise<WhatsAppMessage> {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `Parece que não estou conseguindo processar seu pedido 😢. Por favor, entre em contato com o chef para completar seu pedido: ${process.env.CHEF_NUMBER}`
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