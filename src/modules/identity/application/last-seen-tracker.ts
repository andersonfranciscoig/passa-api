import type { Clock } from "../../../shared/domain/clock";
import type { UserRepository } from "../domain/repositories";

/** Intervalo mínimo entre duas escritas de `lastSeenAt` da mesma conta. */
export const LAST_SEEN_INTERVAL_MS = 2 * 60 * 1000;
const MAX_TRACKED = 10_000;

/**
 * Atualiza a "última vez visto" sem atrasar nem fazer falhar o pedido.
 * Mantém em memória a última escrita por conta para não ir à base de dados a cada pedido;
 * a própria escrita também é condicional (só se o valor guardado tiver mais de 2 minutos).
 */
export class LastSeenTracker {
  private readonly lastWrite = new Map<string, number>();

  constructor(
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  /** Fire-and-forget: nunca lança. Devolve a promessa só para os testes poderem esperar. */
  touch(userId: string, opts: { force?: boolean } = {}): Promise<void> {
    const now = this.clock.now();
    const last = this.lastWrite.get(userId);
    if (!opts.force && last !== undefined && now.getTime() - last < LAST_SEEN_INTERVAL_MS) {
      return Promise.resolve();
    }
    if (this.lastWrite.size >= MAX_TRACKED) this.lastWrite.clear();
    this.lastWrite.set(userId, now.getTime());
    const staleBefore = opts.force ? undefined : new Date(now.getTime() - LAST_SEEN_INTERVAL_MS);
    return this.users.touchLastSeen(userId, now, staleBefore).catch(() => {
      // Falhou: permitir nova tentativa no próximo pedido.
      this.lastWrite.delete(userId);
    });
  }
}
