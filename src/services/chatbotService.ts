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
    try {
      // verifica se há entradas e mensagens válidas
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const messages = changes?.value?.messages?.[0];

      if (!entry || !changes || !messages) {
        console.log('Evento ignorado: Estrutura do corpo inválida ou sem mensagens.');
        res.sendStatus(200); // responde com sucesso para evitar novas tentativas do whatsapp
        return;
      }
      // validação para ignorar mensagens do bot e trazer somente mensagens externas
      else if (body.entry[0].changes[0].value.messages[0].from === process.env.BOT_NUMBER) {
        console.log("Mensagem recebida do bot, ignorando...");
        res.sendStatus(200);
        return;
      } else {
        const from = messages.from;
        const userText = messages.text?.body;
        const name = changes.value.contacts?.[0]?.profile?.name;
        const options = messages.interactive;
        console.log(`Mensagem recebida de ${name} com a mensagem: ${userText}`);

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
          await this.handleUserState(from, options, res, userText);
        }
      }
    } catch (error: any) {
      console.error('Erro ao enviar a mensagem: ', error.response?.data || error.message);
      throw new Error('Ocorreu algum erro ao enviar a mensagem.');
    }
  }

  static async handleUserState(from: string, interactive: Interactive, res: Response, userText: string): Promise<void> {

    const userStateKey = `user${from}:state`;
    const userState = await redisClient.get(userStateKey);

    if (!interactive && !userText) {
      res.status(200).send('Nenhuma mensagem recebida. Aguardando resposta do usuário.');
      return; // NÃO avança no fluxo sem resposta válida
    }
    if (userState) {

      const userStateJson: UserState = JSON.parse(userState);

      if (userStateJson.step.toUpperCase() === "CHOOSE_ITEM") {

        await this.handleItemSelection(interactive?.button_reply?.id, userText, userStateJson, userStateKey);

        await WhatsappService.sendMessage(await WhatsappService.mountMenuMessage(from));
        await WhatsappService.sendMessage(await WhatsappService.getOrderMessage(from));
        res.status(200).send('Mensagens de cardápio e extra enviadas com sucesso!');
        return;
      }

      if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "YES-ID") {

        await WhatsappService.sendMessage(await WhatsappService.getDeliveryValidationMessage(from));
        res.status(200).send('Mensagem de validação de entrega enviada com sucesso!');
        return;
      }

      if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "PICKUP-ID") {

        await redisClient.set(userStateKey, JSON.stringify({ "step": "ORDER_RESUME" }), 'EX', 86400);
        await WhatsappService.sendMessage(await WhatsappService.getPizzeriaAddressMessage(from));
        await WhatsappService.sendMessage(await WhatsappService.getPaymentMethodMessage(from));
        res.status(200).send('Mensagens de endereço e forma de pagamento enviadas com sucesso!');
        return;
      }

      if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "DELIVERY-ID") {

        if (userStateJson.address && userStateJson.address.length > 0) {
          await WhatsappService.sendMessage(await WhatsappService.getAddressValidationMessage(from, userStateJson.address));
          res.status(200).send('Mensagem de validação de endereço enviada com sucesso!');
          return;
        } else {
          await redisClient.set(userStateKey, JSON.stringify({ "step": "ADDRESS" }), 'EX', 86400);
          await WhatsappService.sendMessage(await WhatsappService.getAddressMessage(from));
          res.status(200).send('Mensagem de endereço enviada com sucesso!');
          return;
        }

      }

      if (userStateJson.step.toUpperCase() === "ADDRESS" || userStateJson.step.toUpperCase() === "ADDRESS_EDIT") {
        userStateJson.address = userText;
        await redisClient.set(userStateKey, JSON.stringify(userStateJson), 'EX', 86400);
        await redisClient.set(userStateKey, JSON.stringify({ "step": "ORDER_RESUME" }), 'EX', 86400);
        await WhatsappService.sendMessage(await WhatsappService.getPaymentMethodMessage(from));
        res.status(200).send('Mensagem de forma de pagamento enviada com sucesso!');
        return;
      }

      if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "ADDRESS-ID") {

        await redisClient.set(userStateKey, JSON.stringify({ "step": "ORDER_RESUME" }), 'EX', 86400);
        await WhatsappService.sendMessage(await WhatsappService.getPaymentMethodMessage(from));
        res.status(200).send('Mensagem de forma de pagamento enviada com sucesso!');
        return;

      } else if (interactive && interactive.button_reply.id && interactive.button_reply.id.toUpperCase() === "ADDRESS-EDIT-ID") {

        await redisClient.set(userStateKey, JSON.stringify({ "step": "ADDRESS_EDIT" }), 'EX', 86400);
        await WhatsappService.sendMessage(await WhatsappService.getAddressMessage(from));
        res.status(200).send('Mensagem de endereço enviada com sucesso!');
        return;
      }

      if (userStateJson.step.toUpperCase() === "ORDER_RESUME") {

        // bot manda mensagem final agradecendo, informando o valor total do pedido, forma de pagamento e um tempo de entrega
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

        await redisClient.set(userStateKey, JSON.stringify({ "step": "ORDER_EDIT" }), 'EX', 86400);
        await WhatsappService.sendMessage(await WhatsappService.getOrderEditMessage(from));
        res.status(200).send('Mensagem de endereço enviada com sucesso!');
        return;
      }

      if (userStateJson.step.toUpperCase() === "ORDER_EDIT") {

        // IA do bot analisa e atualiza o pedido
        const AIResponse: Order = await AIService.editOrder(userText, userStateJson.order);
        console.log("AIResponse editOrder", JSON.stringify(AIResponse, null, 2));

        // após análise manda o pedido atualizado para confirmação novamente (repetindo o processo)
        await WhatsappService.sendMessage(await WhatsappService.getOrderValidationMessage(from, AIResponse.resumo, await WhatsappService.getOrderPrice(AIResponse)));
        res.status(200).send('Pedido processado com sucesso!');
        return;
      }

      const AIResponse: Order = await AIService.processOrder(userText, userStateJson.step);
      console.log("AIResponse processOrder", JSON.stringify(AIResponse, null, 2));

      await redisClient.set(userStateKey, JSON.stringify({ "order": AIResponse }), 'EX', 86400);

      if (userStateJson.step.toUpperCase() === "PIZZA_MENU" || userStateJson.step.toUpperCase() === "PF_PIZZA_MENU") {

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
          await WhatsappService.sendMessage(await WhatsappService.getOrderValidationMessage(from, AIResponse.resumo, await WhatsappService.getOrderPrice(AIResponse)));
          res.status(200).send('Pedido processado com sucesso!');
          return;
        }
      }

      if (userStateJson.step.toUpperCase() === "FOGAZZA_MENU" || userStateJson.step.toUpperCase() === "PF_FOGAZZA_MENU") {

        if (AIResponse.fogazza && AIResponse.fogazza.length > 0) {
          for (const item of AIResponse.fogazza) {
            if (!item.sabor) {
              await WhatsappService.sendMessage(await WhatsappService.getSizeErrorMessage(from));
              res.status(200).send('Mensagem de falta de tamanho enviada com sucesso!');
              return;
            }
          }

          await WhatsappService.sendMessage(await WhatsappService.getOrderValidationMessage(from, AIResponse.resumo, await WhatsappService.getOrderPrice(AIResponse)));
          res.status(200).send('Pedido processado com sucesso!');
          return;
        }
      }
    }
  }

  static async handleItemSelection(idItem: string, userText: string, userStateJson: UserState, userStateKey: string): Promise<void> {
    try {
      // método para identificar a melhor correspondência de texto, em caso de digitação errada
      const userOrder = findBestMatch(userText, ['Pizza', 'Fogazza', 'Pizza e Fogazza']);

      if (userStateJson.step.toUpperCase() === "CHOOSE_ITEM") {
        if (idItem?.toUpperCase() === "PIZZA-ID" || userOrder?.toUpperCase() === "PIZZA") {
          await redisClient.set(userStateKey, JSON.stringify({ "step": "PIZZA_MENU" }), 'EX', 86400);
        }
        if (idItem?.toUpperCase() === "FOGAZZA-ID" || userOrder?.toUpperCase() === "FOGAZZA") {
          await redisClient.set(userStateKey, JSON.stringify({ "step": "FOGAZZA_MENU" }), 'EX', 86400);
        }
        if (idItem?.toUpperCase() === "PIZZAFOGAZZA-ID" || userOrder?.toUpperCase() === "PIZZA E FOGAZZA") {
          await redisClient.set(userStateKey, JSON.stringify({ "step": "PF_PIZZA_MENU" }), 'EX', 86400);
        }
      }
      if (userStateJson.step.toUpperCase() === "PF_PIZZA_MENU") {
        redisClient.set(userStateKey, JSON.stringify({ "step": "PF_FOGAZZA_MENU" }), 'EX', 86400);
      }
    } catch (error: any) {
      throw new Error('Não entendi sua solicitação, por favor selecione uma das opções ou digite 🙂');
    }
  }
}