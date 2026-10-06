import "server-only";

import { nowIn } from "@/domain/time";
import type { ActivityEvent, BlockedSlot, Booking, Client } from "@/domain/types";
import { BUSINESS } from "./catalog";
import type { Repository } from "./repository";
import { buildSeed } from "./seed";

interface State {
  clients: Client[];
  bookings: Booking[];
  blocked: BlockedSlot[];
  activity: ActivityEvent[];
}

const sameSlot = (a: BlockedSlot, b: BlockedSlot) =>
  a.date === b.date && a.professionalId === b.professionalId && a.start === b.start;

/**
 * Implementación en memoria para desarrollo y demos: los datos se reinician
 * al reiniciar el servidor. Se guarda en `globalThis` para sobrevivir al
 * hot reload de `next dev`.
 */
export class MemoryRepository implements Repository {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private state: State) {}

  async getClient(id: string) {
    return this.state.clients.find((c) => c.id === id) ?? null;
  }
  async findClientByPhone(phone: string) {
    return this.state.clients.find((c) => c.phone === phone) ?? null;
  }
  async insertClient(client: Client) {
    this.state.clients.push(client);
  }

  async listBookings({ from, to }: { from: string; to: string }) {
    return this.state.bookings.filter((b) => b.date >= from && b.date <= to);
  }
  async listClientBookings(clientId: string) {
    return this.state.bookings.filter((b) => b.clientId === clientId);
  }
  async getBooking(id: string) {
    return this.state.bookings.find((b) => b.id === id) ?? null;
  }
  async insertBooking(booking: Booking) {
    this.state.bookings.push(booking);
  }
  async updateBooking(id: string, patch: Partial<Omit<Booking, "id">>) {
    const i = this.state.bookings.findIndex((b) => b.id === id);
    if (i < 0) return null;
    this.state.bookings[i] = { ...this.state.bookings[i], ...patch };
    return this.state.bookings[i];
  }

  async listBlocked({ from, to }: { from: string; to: string }) {
    return this.state.blocked.filter((s) => s.date >= from && s.date <= to);
  }
  async toggleBlocked(slot: BlockedSlot) {
    const exists = this.state.blocked.some((s) => sameSlot(s, slot));
    this.state.blocked = exists ? this.state.blocked.filter((s) => !sameSlot(s, slot)) : [...this.state.blocked, slot];
    return !exists;
  }

  async listActivity(limit = 50) {
    return [...this.state.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  }
  async insertActivity(event: ActivityEvent) {
    this.state.activity.push(event);
  }
  async markAllActivityRead() {
    this.state.activity = this.state.activity.map((a) => ({ ...a, read: true }));
  }

  transaction<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }
}

const globalForRepo = globalThis as unknown as { filoRepo?: MemoryRepository };

export function getMemoryRepository(): MemoryRepository {
  if (!globalForRepo.filoRepo) {
    const now = nowIn(BUSINESS.timeZone);
    globalForRepo.filoRepo = new MemoryRepository({ ...buildSeed(now.date, now.minute), blocked: [] });
  }
  return globalForRepo.filoRepo;
}
