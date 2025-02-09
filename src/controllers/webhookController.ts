import { Request, Response } from "express";

export const verifyWebhook = (req: Request, res: Response) => {

  // Dados do GET enviado pela Meta para validação do webhook
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Verifica o modo e o token enviados pela Meta
  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso!");
    res.status(200).send(challenge); // Responde com o 'challenge' para validar o webhook
  } else {
    console.error("Falha na verificação do webhook.");
    res.sendStatus(403); // Retorna erro se o token estiver incorreto
  }
};
