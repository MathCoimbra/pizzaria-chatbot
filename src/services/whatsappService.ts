import redisClient from "../../utils/redisClient";
import { whatsappApi } from "../config/whatsappApi";
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

  static getPizzaMenuMessage(): string {
    return `🍕 *Cardápio de Pizzas* 🍕\n\n*📌 Pizzas Salgadas:*\n
    1️⃣ *A Moda do Chefe* - Calabresa, cebola, catupiry, mussarela e bacon
    Broto R$ 37 | Grande R$ 49\n
    2️⃣ *A Moda do Cliente* - Escolha até 5 ingredientes (exceto Catupiry Original)
    Broto R$ 40 | Grande R$ 52\n
    3️⃣ *Atum* - Atum e cebola
    Broto R$ 30 | Grande R$ 42\n
    4️⃣ *Atumpiry* - Atum e catupiry
    Broto R$ 33 | Grande R$ 45\n
    5️⃣ *Atumrela* - Atum, mussarela e cebola
    Broto R$ 34 | Grande R$ 46\n
    6️⃣ *Bacon* - Bacon, mussarela e catupiry
    Broto R$ 34 | Grande R$ 46\n
    7️⃣ *Baiacatu* - Calabresa, cebola e catupiry
    Broto R$ 34 | Grande R$ 46\n
    8️⃣ *Baiana* - Calabresa moída, pimenta, ovos e mussarela
    Broto R$ 34 | Grande R$ 46\n
    9️⃣ *Bauru* - Mussarela, presunto e tomate
    Broto R$ 34 | Grande R$ 46\n
    🔟 *Brócolis II* - Brócolis, bacon, tomate, milho e catupiry
    Broto R$ 38 | Grande R$ 50\n
    1️⃣1️⃣ *Caipira* - Frango desfiado, catupiry, milho e bacon
    Broto R$ 34 | Grande R$ 46\n
    1️⃣2️⃣ *Calabresa* - Calabresa e cebola
    Broto R$ 30 | Grande R$ 42\n
    1️⃣3️⃣ *Calabresa c/ Barbecue* - Calabresa, barbecue e cebola
    Broto R$ 34 | Grande R$ 46\n
    1️⃣4️⃣ *Carne Seca* - Carne seca, cebola, catupiry, mussarela e pimenta biquinho
    Broto R$ 40 | Grande R$ 52\n
    1️⃣5️⃣ *Catupiry* - Molho de tomate e catupiry
    Broto R$ 30 | Grande R$ 42\n
    1️⃣6️⃣ *Frango a 2 Queijos* - Frango, catupiry e mussarela
    Broto R$ 37 | Grande R$ 49\n
    1️⃣7️⃣ *Frango a 3 Queijos* - Frango, catupiry, parmesão e mussarela
    Broto R$ 38 | Grande R$ 50\n
    1️⃣8️⃣ *Frango c/ Catupiry* - Frango desfiado e catupiry
    Broto R$ 34 | Grande R$ 46\n
    1️⃣9️⃣ *Lombo I* - Lombo e catupiry
    Broto R$ 33 | Grande R$ 45\n
    2️⃣0️⃣ *Lombo II* - Lombo, cebola e mussarela
    Broto R$ 32 | Grande R$ 44\n
    2️⃣1️⃣ *Marguerita* - Mussarela, manjericão e tomate
    Broto R$ 30 | Grande R$ 42\n
    2️⃣2️⃣ *Milho Verde* - Catupiry e milho verde
    Broto R$ 30 | Grande R$ 42\n
    2️⃣3️⃣ *Mussarela* - Mussarela e tomate
    Broto R$ 30 | Grande R$ 42\n
    2️⃣4️⃣ *Palmito* - Catupiry, palmito, milho, mussarela e tomate
    Broto R$ 37 | Grande R$ 49\n
    2️⃣5️⃣ *Paulista* - Presunto, palmito, mussarela, bacon e cebola
    Broto R$ 37 | Grande R$ 49\n
    2️⃣6️⃣ *Pepperoni* - Pepperoni, mussarela, tomate e parmesão
    Broto R$ 42 | Grande R$ 54\n
    2️⃣7️⃣ *Pernil* - Pernil, cebola, pimentão, catupiry, mussarela e azeitona preta
    Broto R$ 40 | Grande R$ 52\n
    2️⃣8️⃣ *Portuguesa* - Mussarela, presunto, ovos e milho
    Broto R$ 34 | Grande R$ 46\n
    2️⃣9️⃣ *Quatro Queijos* - Cheddar, catupiry, parmesão e mussarela
    Broto R$ 38 | Grande R$ 50\n
    3️⃣0️⃣ *Temaki* - Atum, cream cheese, catupiry, molho tarê e cebolinha
    Broto R$ 40 | Grande R$ 52\n
    3️⃣1️⃣ *Toscana* - Calabresa, mussarela e cebola
    Broto R$ 34 | Grande R$ 46\n\n*📌 Pizzas Doces:*\n
    1️⃣ *Brigadeiro* - Chocolate e granulado
    Broto R$ 31 | Grande R$ 43\n
    2️⃣ *Chocolate c/ Banana* - Chocolate, banana e granulado
    Broto R$ 33 | Grande R$ 45\n
    3️⃣ *Chocolate c/ Morango* - Chocolate, morango e granulado
    Broto R$ 38 | Grande R$ 50\n
    4️⃣ *Chocolate c/ Uva* - Chocolate, uva e granulado
    Broto R$ 38 | Grande R$ 50\n
    5️⃣ *Dois Amores* - Chocolate ao leite e chocolate branco
    Broto R$ 36 | Grande R$ 48\n
    6️⃣ *Nutella c/ Banana* - Nutella, banana e granulado
    Broto R$ 48 | Grande R$ 60\n
    7️⃣ *Nutella c/ Morango* - Nutella, morango e granulado
    Broto R$ 48 | Grande R$ 60\n
    8️⃣ *Nutella c/ Uva* - Nutella, uva e granulado
    Broto R$ 48 | Grande R$ 60\n
    9️⃣ *Oreo* - Chocolate ao leite, chocolate branco e mini Oreo
    Broto R$ 43 | Grande R$ 55\n
    🔟 *Prestígio* - Chocolate ao leite, coco ralado e chocolate branco
    Broto R$ 38 | Grande R$ 50\n
    1️⃣1️⃣ *Romeu e Julieta* - Mussarela e goiabada
    Broto R$ 38 | Grande R$ 50\n`;
  }

  static getFogazzaMenuMessage(): string {
    return `*Fogazzas*:\n
        1️⃣ - A MODA O CHEFE................. R$ 30,00\n
          Calabresa, cebola, catupiry, mussarela e bacon\n
        2️⃣ - À MODA DO CLIENTE............... R$ 35,00\n
          Escolha até 5 ingredientes (Exceto Catupiry Original)\n
        3️⃣ - ATUM............................ R$ 25,00\n
          Atum e cebola em rodelas\n
        4️⃣ - ATUMPIRY......................... R$ 27,00\n
          Atum e catupiry\n
        5️⃣ - ATUMRELA......................... R$ 29,00\n
          Atum, mussarela e cebola em rodelas\n
        6️⃣ - BACON........................... R$ 29,00\n
          Bacon, mussarela e catupiry\n
        7️⃣ - BAIACATU........................ R$ 29,00\n
          Calabresa, cebola e catupiry\n
        8️⃣ - BAIANA.......................... R$ 29,00\n
          Calabresa moída, pimenta, ovos e mussarela\n
        9️⃣ - BAURU........................... R$ 29,00\n
          Mussarela, presunto e tomate\n
        1️⃣0️⃣ - BRÓCOLIS II..................... R$ 33,00\n
            Brócolis, bacon, tomate, milho e catupiry\n
        1️⃣1️⃣ - CAIPIRA........................ R$ 29,00\n
            Frango desfiado, catupiry, milho e bacon\n
        1️⃣2️⃣ - CALABRESA...................... R$ 25,00\n
            Calabresa e cebola em rodelas\n
        1️⃣3️⃣ - CALABRESA C/ BARBECUE.......... R$ 29,00\n
            Calabresa, barbecue e cebola em rodelas\n
        1️⃣4️⃣ - CARNE SECA...................... R$ 35,00\n
            Carne seca, cebola, catupiry, mussarela e pimenta biquinho\n
        1️⃣5️⃣ - CATUPIRY........................ R$ 25,00\n
            Molho de tomate e catupiry\n
        1️⃣6️⃣ - FRANGO A 2 QUEIJOS.............. R$ 32,00\n
            Frango, catupiry e mussarela\n
        1️⃣6️⃣ - FRANGO A 3 QUEIJOS.............. R$ 33,00\n
            Frango, catupiry, parmesão e mussarela\n
        1️⃣7️⃣ - FRANGO C/ CATUPIRY.............. R$ 29,00\n
            Frango desfiado e catupiry\n
        1️⃣8️⃣ - LOMBO I......................... R$ 28,00\n
            Lombo e catupiry\n
        1️⃣9️⃣ - LOMBO II........................ R$ 27,00\n
            Lombo, cebola e mussarela\n
        2️⃣0️⃣ - MARGUERITA...................... R$ 25,00\n
            Mussarela, manjericão e tomate em rodelas\n
        2️⃣1️⃣ - MILHO VERDE..................... R$ 25,00\n
            Catupiry e milho verde\n
        2️⃣2️⃣ - MUSSARELA...................... R$ 25,00\n
            Mussarela e tomate em rodelas\n
        2️⃣3️⃣ - PALMITO......................... R$ 32,00\n
            Catupiry, palmito, milho, mussarela e tomate\n
        2️⃣4️⃣ - PAULISTA........................ R$ 32,00\n
            Presunto, palmito, mussarela, bacon e cebola\n
        2️⃣5️⃣ - PEPPERONI....................... R$ 37,00\n
            Pepperoni, mussarela, tomate e parmesão\n
        2️⃣6️⃣ - PERNIL.......................... R$ 35,00\n
            Pernil, cebola, pimentão, catupiry, mussarela e azeitona preta\n
        2️⃣7️⃣ - PORTUGUESA...................... R$ 29,00\n
            Mussarela, presunto, ovos e milho\n
        2️⃣8️⃣ - QUATRO QUEIJOS.................. R$ 33,00\n
            Cheddar, catupiry, parmesão e mussarela\n
        2️⃣9️⃣ - TEMAKI.......................... R$ 35,00\n
            Atum, cream cheese, catupiry, molho tarê e cebolinha\n
        3️⃣0️⃣ - TOSCANA........................ R$ 29,00\n
            Calabresa, mussarela e cebola em rodelas\n`;
  }

  static async getExtraMessage(to: string): Promise<WhatsAppMessage> {

    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: `*📌 Extras*\n
    *🍰 Bordas Recheadas:*\n
     *Catupiry* - R$ 10\n
     *Cheddar* - R$ 10\n
     *Mussarela* - R$ 10\n
     *Cream Cheese* - R$ 10\n
     *Chocolate* - R$ 10\n
    *🥤 Refrigerantes:*\n
     *Coca-Cola* - 350ml | R$ 5\n
     *Guaraná Antarctica* - 350ml | R$ 5\n
     *Fanta Laranja* - 350ml | R$ 5\n`
      }
    };

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

  static async getOrderValidationMessage(to: string, order: string): Promise<WhatsAppMessage> {

    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `🧑‍🍳 Pedido anotado! \n\n${order} \n\nConfirme com as opções abaixo:`,
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