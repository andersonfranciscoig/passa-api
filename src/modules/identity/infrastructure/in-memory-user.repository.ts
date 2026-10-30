import type { UserRepository } from "../domain/repositories";
import type { User } from "../domain/user";

export class InMemoryUserRepository implements UserRepository {
  constructor(private readonly items: User[] = []) {}

  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }

  async findByEmail(email: string) {
    return this.items.find((u) => u.email === email) ?? null;
  }

  async findByPhone(phone: string) {
    return this.items.find((u) => u.phone === phone) ?? null;
  }

  async save(user: User) {
    const i = this.items.findIndex((u) => u.id === user.id);
    if (i === -1) this.items.push(user);
    else this.items[i] = user;
  }

  async touchLastSeen(id: string, at: Date, staleBefore?: Date) {
    const i = this.items.findIndex((u) => u.id === id);
    if (i === -1) return;
    const current = this.items[i].lastSeenAt;
    if (staleBefore && current && current >= staleBefore) return;
    this.items[i] = { ...this.items[i], lastSeenAt: at };
  }
}
