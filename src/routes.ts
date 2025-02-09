import { Router } from "express";
import { MessageController } from "./controllers/messageController";
import { verifyWebhook } from "./controllers/webhookController";

const router = Router();

router.post('/webhook', MessageController.receiveMessage);

// Rota para verificação do webhook
router.get("/webhook", verifyWebhook);  

export default router;