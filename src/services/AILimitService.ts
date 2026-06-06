import redisClient from "../middlewares/redisClient";

export class AILimitService {
  private static readonly AI_CALL_LIMIT = parseInt(process.env.AI_CALL_LIMIT || "3", 10);
  private static readonly LIMIT_RESET_TIME = 86400; // 24 horas em segundos

  /**
   * Verifica se o usuário atingiu o limite de chamadas à IA
   * @param from - Número de telefone do usuário
   * @returns true se atingiu o limite, false caso contrário
   */
  static async hasReachedLimit(from: string): Promise<boolean> {
    const key = `ai-call-count:${from}`;
    const currentCount = await redisClient.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    return count >= this.AI_CALL_LIMIT;
  }

  /**
   * Incrementa o contador de chamadas à IA para o usuário
   * @param from - Número de telefone do usuário
   */
  static async incrementCallCount(from: string): Promise<void> {
    const key = `ai-call-count:${from}`;
    const currentCount = await redisClient.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    await redisClient.set(key, String(count + 1), "EX", this.LIMIT_RESET_TIME);
  }
}
