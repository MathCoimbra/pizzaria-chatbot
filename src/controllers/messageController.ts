import { Request, Response } from 'express';
import { WhatsAppWebhookEvent } from '../types/whatsapp';
import { ChatbotService } from '../services/chatbotService';

// responsável por receber a mensagem e responder
export class MessageController {
  static async receiveMessage(req: Request, res: Response) {
    try {
      console.log('Webhook Payload:', JSON.stringify(req.body, null, 2));
      const body: WhatsAppWebhookEvent = req.body;
      await ChatbotService.processMessage(body, res);
    } catch (error) {
      console.error('Erro no processamento da mensagem de resposta: ', error);
      res.status(500).send('Erro ao enviar a mensagem de resposta.');
    }
  }
}