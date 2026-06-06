import { Response } from 'express';
import { Interactive, WhatsAppWebhookEvent } from "../types/whatsapp";
import { WhatsappService } from './whatsappService';
import redisClient from '../middlewares/redisClient';
import { UserState } from '../types/userState';
import { findBestMatch } from '../../utils/stringSimilarity';
import { AIService } from './AIService';
import { Order } from '../types/order';

// serviço de envio da mensagem pelo whatsapp
export class ChatbotService {
  static async processMessage(body: WhatsAppWebhookEvent, res: Response): Promise<void> {
    // verifica se há entradas e mensagens válidas
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const statuses = changes?.value?.statuses?.[0];
    const messages = changes?.value?.messages?.[0];

    if (!entry || !changes || !messages || statuses) {
      console.log('Evento ignorado: Estrutura do corpo inválida ou sem mensagens.');
      res.sendStatus(200); // responde com sucesso para evitar novas tentativas do whatsapp
      return;
    }

    const messageId = messages.id;
    if (!messageId) {
      console.log('Evento ignorado: mensagem sem id.');
      res.sendStatus(200);
      return;
    }

    // validação para ignorar mensagens do bot e trazer somente mensagens externas
    if (body.entry[0].changes[0].value.messages[0].from === process.env.BOT_NUMBER) {
      console.log("Mensagem recebida do bot, ignorando...");
      res.sendStatus(200);
      return;
    }
    /* validar messageID pra evitar duplicidade nas mensagens caso tenha alguma indisponibilidade */
    const alreadyProcessed = await redisClient.get(`msg:${messageId}`);
    if (alreadyProcessed) {
      res.sendStatus(200);
      return;
    }
    await redisClient.set(`msg:${messageId}`, "1", "EX", 3600);

    /* inicia o fluxo */
    const from = messages.from;
    const userText = messages.text?.body;
    const name = changes.value.contacts?.[0]?.profile?.name;
    const options = messages.interactive;
    console.log(`Mensagem recebida de ${name} com a mensagem: ${userText}`);

    try {
      // key para controle de estado do usuário
      const userStateKey = `user${from}:state`;
      const userState = await redisClient.get(userStateKey);

      // verifica se é a primeira interação do usuário
      if (!userState) {
        await WhatsappService.sendMessage(WhatsappService.mountItemChoiceMessage(from, WhatsappService.getWelcomeMessage(name)));
        await redisClient.set(userStateKey, JSON.stringify({ "step": "CHOOSE_ITEM" }), 'EX', 86400);
        res.status(200).send('Mensagem de boas-vindas enviada com sucesso!');
        return;
      } else {
        await this.handleUserState(from, options, res, userText, name);
      }
    } catch (error: any) {
      console.error('Erro ao enviar a mensagem: ', error.response?.data || error.message);
      await WhatsappService.sendMessage(await WhatsappService.getErrorMessage(from));
      // Ainda retorna 200 para o WhatsApp (evita retry)
      res.status(200).send('Erro ao processar solicação, mas mensagem enviada.');
      throw new Error('Ocorreu algum erro ao enviar a mensagem.');
    }
  }

  static async handleUserState(from: string, interactive: Interactive, res: Response, userText: string, name: string): Promise<void> {

    const userStateKey = `user${from}:state`;
    const userState = await redisClient.get(userStateKey);

    if (!interactive && !userText) {
      res.status(200).send('Nenhuma mensagem recebida. Aguardando resposta do usuário.');
      return; // NÃO avança no fluxo sem resposta válida
    }
    if (userState) {

      const userStateJson: UserState = JSON.parse(userState);

      if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "YES-ID") {

        await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, step: "CHECK_DELIVERY" }), 'EX', 86400);
        await WhatsappService.sendMessage(await WhatsappService.getDeliveryValidationMessage(from));
        res.status(200).send('Mensagem de validação de entrega enviada com sucesso!');
        return;
      }

      if (userStateJson.step.toUpperCase() === "CHECK_DELIVERY") {

        const userDelivery = findBestMatch(userText, ['Entrega', 'Retirada']);

        if ((interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "PICKUP-ID") || userDelivery?.toUpperCase() === 'RETIRADA') {

          await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, step: "CHECK_PAYMENT" }), 'EX', 86400);
          await WhatsappService.sendMessage(await WhatsappService.getPizzeriaAddressMessage(from));
          await WhatsappService.sendMessage(await WhatsappService.getPaymentMethodMessage(from));
          res.status(200).send('Mensagens de endereço e forma de pagamento enviadas com sucesso!');
          return;
        }

        if ((interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "DELIVERY-ID") || userDelivery?.toUpperCase() === 'ENTREGA') {

          if (userStateJson.address && userStateJson.address.length > 0) {
            await WhatsappService.sendMessage(await WhatsappService.getAddressValidationMessage(from, userStateJson.address));
            res.status(200).send('Mensagem de validação de endereço enviada com sucesso!');
            return;
          } else {
            await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, "step": "ADDRESS" }), 'EX', 86400);
            await WhatsappService.sendMessage(await WhatsappService.getAddressMessage(from));
            res.status(200).send('Mensagem de endereço enviada com sucesso!');
            return;
          }

        }

        if (userText) {
          await WhatsappService.sendMessage(await WhatsappService.getInvalidChoiceMessage(from));
          res.status(200).send('Mensagem de opção inválida enviada com sucesso!');
          return;
        }
      }

      if (userStateJson.step.toUpperCase() === "CHOOSE_ITEM") {

        const itemSelected = await this.handleItemSelection(interactive?.button_reply?.id, userText, userStateJson, userStateKey, res, from);
        if (!itemSelected) {
          return;
        }

        await WhatsappService.sendMessage(await WhatsappService.getMenuMessage(from));
        await WhatsappService.sendMessage(await WhatsappService.getOrderMessage(from));
        res.status(200).send('Mensagens de cardápio e extra enviadas com sucesso!');
        return;
      }

      if (userStateJson.step.toUpperCase() === "ADDRESS" || userStateJson.step.toUpperCase() === "ADDRESS_EDIT") {
        if (!this.isValidAddress(userText)) {
          await WhatsappService.sendMessage(await WhatsappService.getAddressErrorMessage(from));
          res.status(200).send('Mensagem de endereço inválido enviada com sucesso!');
          return;
        }

        userStateJson.address = userText;
        userStateJson.step = "CHECK_PAYMENT";
        await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson }), 'EX', 86400);
        await WhatsappService.sendMessage(await WhatsappService.getPaymentMethodMessage(from));
        res.status(200).send('Mensagem de forma de pagamento enviada com sucesso!');
        return;
      }

      if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "ADDRESS-ID") {

        await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, step: "CHECK_PAYMENT" }), 'EX', 86400);
        await WhatsappService.sendMessage(await WhatsappService.getPaymentMethodMessage(from));
        res.status(200).send('Mensagem de forma de pagamento enviada com sucesso!');
        return;

      } else if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "ADDRESS-EDIT-ID") {

        await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, step: "ADDRESS_EDIT" }), 'EX', 86400);
        await WhatsappService.sendMessage(await WhatsappService.getAddressMessage(from));
        res.status(200).send('Mensagem de endereço enviada com sucesso!');
        return;
      }


      if (userStateJson.step.toUpperCase() === "CHECK_PAYMENT") {

        const userPayment = findBestMatch(userText, ['Cartão de crédito', 'Crédito', 'Cartão de débito', 'Débito', 'Dinheiro', 'Pix']);
        if (userPayment != null) {
          userStateJson.paymentMethod = userPayment;

          await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, step: "ORDER_RESUME" }), 'EX', 86400);
          await WhatsappService.sendMessage(await WhatsappService.getSummaryMessage(from, userStateJson));
          await WhatsappService.sendMessage(await WhatsappService.getOrderResumeMessage(process.env.CHEF_NUMBER, userStateJson, name, from));
          res.status(200).send('Pedido enviado com sucesso!');
          return;

        } else {
          await WhatsappService.sendMessage(await WhatsappService.getPaymentErrorMessage(from));
          res.status(200).send('Mensagem de forma de pagamento inválida enviada com sucesso!');
          return;
        }
      }

      if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "NO-ID") {

        await WhatsappService.sendMessage(await WhatsappService.getOrderEditOrCancelMessage(from));
        res.status(200).send('Mensagem de endereço enviada com sucesso!');
        return;
      }

      if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "ORDER-CANCEL-ID") {

        // bot cancela o pedido → resetando o estado do usuário (excluindo os dados de estado)
        await redisClient.del(userStateKey);
        // manda mensagem lamentando e informando se caso querer pedir em algum momento só avisar
        await WhatsappService.sendMessage(await WhatsappService.getCancelMessage(from));
        res.status(200).send('Mensagem de endereço enviada com sucesso!');
        return;
      }

      if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "ORDER-EDIT-ID") {

        await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, step: "ORDER_EDIT" }), 'EX', 86400);
        await WhatsappService.sendMessage(await WhatsappService.getOrderEditMessage(from));
        res.status(200).send('Mensagem de endereço enviada com sucesso!');
        return;
      }

      if (userStateJson.step.toUpperCase() === "ORDER_EDIT") {

        // IA do bot analisa e atualiza o pedido
        const AIResponse: Order = await AIService.editOrder(userText, userStateJson.order, from);
        console.log("AIResponse editOrder", JSON.stringify(AIResponse, null, 2));

        if (AIResponse.limitAchieved) {
          await WhatsappService.sendMessage(await WhatsappService.getContactChefMessage(from));
          res.status(200).send('Limite de edições atingido. Cliente orientado a contatar o chef.');
          return;
        }

        if (AIResponse.error) {
          await WhatsappService.sendMessage(await WhatsappService.getOrderErrorMessage(from));
          res.status(200).send('Mensagem de erro ao editar pedido enviada com sucesso!');
          return;
        }

        await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, order: AIResponse }), 'EX', 86400);

        // após análise manda o pedido atualizado para confirmação novamente (repetindo o processo)
        await WhatsappService.sendMessage(await WhatsappService.getOrderValidationMessage(from, AIResponse.resumo, await WhatsappService.getOrderPrice(AIResponse, from)));
        res.status(200).send('Pedido processado com sucesso!');
        return;
      }

      if (userStateJson.step.toUpperCase() === "PIZZA_MENU" || userStateJson.step.toUpperCase() === "PF_PIZZA_MENU") {

        const AIResponse: Order = await AIService.processOrder(userText, userStateJson.step, from);
        console.log("AIResponse processOrder", JSON.stringify(AIResponse, null, 2));

        if (AIResponse.limitAchieved) {
          await WhatsappService.sendMessage(await WhatsappService.getContactChefMessage(from));
          res.status(200).send('Limite de processamento atingido. Cliente orientado a contatar o chef.');
          return;
        }

        if (AIResponse.error) {
          await WhatsappService.sendMessage(await WhatsappService.getOrderErrorMessage(from));
          res.status(200).send('Mensagem de erro ao processar pedido enviada com sucesso!');
          return;
        }

        await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, order: AIResponse }), 'EX', 86400);

        if (AIResponse.pizza && AIResponse.pizza.length > 0) {
          for (const item of AIResponse.pizza) {

            if (!item.tamanho || !item.sabor) {
              await WhatsappService.sendMessage(await WhatsappService.getFlavorSizeErrorMessage(from));
              res.status(200).send('Mensagem de falta de tamanho enviada com sucesso!');
              return;
            }

            if (Array.isArray(item.sabor) && item.sabor.some((flavor: string) => findBestMatch(flavor, WhatsappService.getFlavor()) === "moda_cliente")
            ) {
              await WhatsappService.sendMessage(await WhatsappService.getClientFlavorErrorMessage(from));
              res.status(200).send('Mensagem de alerta sobre sabor "A Moda do Cliente" na pizza meia meia enviada com sucesso!');
              return;
            }

            if (typeof item.sabor === "string" && findBestMatch(item.sabor, WhatsappService.getFlavor()) === "moda_cliente") {

              if (!item.ingredientes) {
                await WhatsappService.sendMessage(await WhatsappService.getFlavorSizeErrorMessage(from));
                res.status(200).send('Mensagem de falta de tamanho enviada com sucesso!');
                return;
              } else {

                const flavorsArray = item.ingredientes
                  .split(/,| e |;/i)
                  .map(flavor => flavor.trim())
                  .filter(flavor => flavor.length > 0);

                // Lista de todos os sabores possíveis
                const allFlavors = [
                  "calabresa", "cebola", "mussarela", "bacon", "atum", "calabresa_moida", "pimenta", "ovos", "presunto", "tomate", "brocolis", "milho", "frango_desfiado", "barbecue", "carne_seca", "pimenta_biquinho", "frango", "parmesao", "lombo", "manjericao", "milho_verde", "palmito", "pepperoni", "pernil", "pimentao", "azeitona_preta", "cheddar", "cream_cheese", "molho_tare", "cebolinha", "molho_de_tomate"
                ];

                // Ingredientes enviados pelo cliente (normalizados)
                const clientFlavors = flavorsArray.map(flavor =>
                  findBestMatch(flavor, allFlavors)
                );

                // todos os sabores disponíveis
                const availableFlavors: string[] = [];
                for (const flavor of allFlavors) {
                  const status = await redisClient.hget(`flavor:${flavor}`, "status");
                  if (status === "ok") {
                    availableFlavors.push(flavor);
                  }
                }

                // pendentFlavors: sabores enviados pelo cliente que não estão disponíveis
                const pendentFlavors: string[] = [];
                for (const flavor of clientFlavors) {
                  const status = await redisClient.hget(`flavor:${flavor}`, "status");
                  if (status !== "ok" && flavor) {
                    pendentFlavors.push(flavor);
                  }
                }

                if (pendentFlavors.length > 0) {
                  await WhatsappService.sendMessage(await WhatsappService.getFlavorErrorMessage(from, pendentFlavors, availableFlavors));
                  res.status(200).send(`Mensagem de sabor(es) pendente(es) enviada com sucesso!`);
                  return;
                }
              }
            }

          }
          await WhatsappService.sendMessage(await WhatsappService.getOrderValidationMessage(from, AIResponse.resumo, await WhatsappService.getOrderPrice(AIResponse, from)));
          res.status(200).send('Pedido processado com sucesso!');
          return;
        }
      }

      if (userStateJson.step.toUpperCase() === "FOGAZZA_MENU" || userStateJson.step.toUpperCase() === "PF_FOGAZZA_MENU") {

        const AIResponse: Order = await AIService.processOrder(userText, userStateJson.step, from);
        console.log("AIResponse processOrder", JSON.stringify(AIResponse, null, 2));

        if (AIResponse.limitAchieved) {
          await WhatsappService.sendMessage(await WhatsappService.getContactChefMessage(from));
          res.status(200).send('Limite de processamento atingido. Cliente orientado a contatar o chef.');
          return;
        }

        if (AIResponse.error) {
          await WhatsappService.sendMessage(await WhatsappService.getOrderErrorMessage(from));
          res.status(200).send('Mensagem de erro ao processar pedido enviada com sucesso!');
          return;
        }

        await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, order: AIResponse }), 'EX', 86400);

        if (AIResponse.fogazza && AIResponse.fogazza.length > 0) {
          for (const item of AIResponse.fogazza) {
            if (!item.sabor) {
              await WhatsappService.sendMessage(await WhatsappService.getSizeErrorMessage(from));
              res.status(200).send('Mensagem de falta de tamanho enviada com sucesso!');
              return;
            }
          }

          await WhatsappService.sendMessage(await WhatsappService.getOrderValidationMessage(from, AIResponse.resumo, await WhatsappService.getOrderPrice(AIResponse, from)));
          res.status(200).send('Pedido processado com sucesso!');
          return;
        }
      }

    }
  }

  static isValidAddress(address?: string): boolean {
    if (!address) {
      return false;
    }

    const normalized = address.trim();
    if (normalized.length < 10) {
      return false;
    }

    const hasNumber = /\d/.test(normalized);
    const words = normalized
      .toLowerCase()
      .replace(/[.,;]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    const streetKeywords = [
      'rua', 'avenida', 'av', 'travessa', 'trav', 'rodovia', 'rod', 'praça', 'praca',
      'estrada', 'alameda', 'bairro', 'condominio', 'cond.', 'quadra', 'lote', 'bloco', 'conjunto'
    ];

    const hasStreetWord = words.some(word => findBestMatch(word, streetKeywords) != null);
    return hasNumber && (hasStreetWord || words.length >= 3);
  }

  static async handleItemSelection(idItem: string, userText: string, userStateJson: UserState, userStateKey: string, res: Response, from: string): Promise<boolean> {
    try {
      // método para identificar a melhor correspondência de texto, em caso de digitação errada
      const userOrder = findBestMatch(userText, ['Pizza', 'Fogazza', 'Pizza e Fogazza']);

      if (userStateJson.step.toUpperCase() === "CHOOSE_ITEM") {
        if (idItem?.toUpperCase() === "PIZZA-ID" || userOrder?.toUpperCase() === "PIZZA") {
          await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, step: "PIZZA_MENU" }), 'EX', 86400);
          return true;
        }
        if (idItem?.toUpperCase() === "FOGAZZA-ID" || userOrder?.toUpperCase() === "FOGAZZA") {
          await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, step: "FOGAZZA_MENU" }), 'EX', 86400);
          return true;
        }
        /*  if (idItem?.toUpperCase() === "PIZZAFOGAZZA-ID" || userOrder?.toUpperCase() === "PIZZA E FOGAZZA") {
           await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, step: "PF_PIZZA_MENU" }), 'EX', 86400);
           return true;
         } */
      }
      /*  if (userStateJson.step.toUpperCase() === "PF_PIZZA_MENU") {
         await redisClient.set(userStateKey, JSON.stringify({ ...userStateJson, step: "PF_FOGAZZA_MENU" }), 'EX', 86400);
         return true;
       } */

      await WhatsappService.sendMessage(await WhatsappService.getInvalidChoiceMessage(from));
      res.status(200).send('Mensagem de escolha inválida enviada com sucesso!');
      return false;

    } catch (error: any) {
      console.error('Erro em handleItemSelection:', error.message);
      await WhatsappService.sendMessage(await WhatsappService.getErrorMessage(from));
      // Ainda retorna 200 para o WhatsApp (evita retry)
      res.status(200).send('Erro ao processar solicação, mas mensagem enviada.');
      return false;
    }
  }
}