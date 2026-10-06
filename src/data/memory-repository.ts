import "server-only";

import { nowIn } from "@/domain/time";
import type { ActivityEvent, BlockedSlot, Booking, Client, Professional, StaffUser } from "@/domain/types";
import { hashPassword, temporaryPassword } from "@/lib/password";
import { env, isDemo } from "@/server/env";
import { BUSINESS } from "./catalog";
import type { Repository } from "./repository";
import { buildSeed } from "./seed";

interface State {
  version: number;
  professionals: Professional[];
  staff: StaffUser[];
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

  async listProfessionals() {
    return this.state.professionals;
  }
  async insertProfessional(professional: Professional) {
    this.state.professionals.push(professional);
  }
  async updateProfessional(id: string, patch: Partial<Omit<Professional, "id">>) {
    this.state.professionals = this.state.professionals.map((p) => (p.id === id ? { ...p, ...patch } : p));
  }

  async listStaff() {
    return this.state.staff;
  }
  async getStaff(id: string) {
    return this.state.staff.find((u) => u.id === id) ?? null;
  }
  async findStaffByEmail(email: string) {
    const key = email.trim().toLowerCase();
    return this.state.staff.find((u) => u.email === key) ?? null;
  }
  async insertStaff(user: StaffUser) {
    this.state.staff.push({ ...user, email: user.email.trim().toLowerCase() });
  }
  async updateStaff(id: string, patch: Partial<Omit<StaffUser, "id">>) {
    const i = this.state.staff.findIndex((u) => u.id === id);
    if (i < 0) return null;
    this.state.staff[i] = { ...this.state.staff[i], ...patch };
    return this.state.staff[i];
  }

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

  async blockSlots(slots: BlockedSlot[]) {
    const fresh = slots.filter((slot) => !this.state.blocked.some((s) => sameSlot(s, slot)));
    this.state.blocked = [...this.state.blocked, ...fresh];
  }
  async unblockRange({
    date,
    professionalIds,
    from,
    to,
  }: {
    date: string;
    professionalIds: string[];
    from: number;
    to: number;
  }) {
    const inRange = (s: BlockedSlot) =>
      s.date === date && professionalIds.includes(s.professionalId) && s.start >= from && s.start < to;
    const before = this.state.blocked.length;
    this.state.blocked = this.state.blocked.filter((s) => !inRange(s));
    return before - this.state.blocked.length;
  }

  async listActivity(limit = 50) {
    return [...this.state.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  }
  async insertActivity(event: ActivityEvent) {
    this.state.activity.push(event);
  }
  async markActivityRead(staffId: string, eventIds: string[]) {
    this.state.activity = this.state.activity.map((a) =>
      eventIds.includes(a.id) && !a.readBy.includes(staffId) ? { ...a, readBy: [...a.readBy, staffId] } : a,
    );
  }

  transaction<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }
}

/** Subir este número cuando cambie la forma de `State`: el dev server rearma los datos. */
const STATE_VERSION = 3;

export const ADMIN_STAFF_ID = "staff-romina";
/** Peluquero con el que entra la demo cuando se elige "probar como peluquero". */
export const DEMO_PROFESSIONAL_STAFF_ID = "staff-lucas";

/**
 * Cuentas iniciales del equipo. La del admin sale de las variables de entorno
 * (`ADMIN_EMAIL` / `ADMIN_PASSWORD`); en la demo se agregan Lucas y Sofía
 * para probar el acceso de cada peluquero.
 */
function seedStaff(): StaffUser[] {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, DEV_STAFF_PASSWORD } = env();
  const createdAt = new Date().toISOString();
  const staff: StaffUser[] = [
    {
      id: ADMIN_STAFF_ID,
      name: "Romina",
      email: ADMIN_EMAIL.toLowerCase(),
      role: "admin",
      professionalId: "romi",
      passwordHash: hashPassword(ADMIN_PASSWORD),
      mustChangePassword: false,
      active: true,
      createdAt,
    },
  ];
  // En la demo siempre existen (el ingreso de prueba entra como Lucas); sin
  // DEV_STAFF_PASSWORD su contraseña es aleatoria y nadie la conoce.
  if (isDemo) {
    const hash = hashPassword(DEV_STAFF_PASSWORD ?? temporaryPassword());
    for (const [id, name, email, professionalId] of [
      ["staff-lucas", "Lucas", "lucas@filo.test", "lucas"],
      ["staff-sofia", "Sofía", "sofia@filo.test", "sofi"],
    ]) {
      staff.push({
        id,
        name,
        email,
        role: "professional",
        professionalId,
        passwordHash: hash,
        mustChangePassword: false,
        active: true,
        createdAt,
      });
    }
  }
  return staff;
}

/**
 * Los datos viven en `globalThis` para sobrevivir al hot reload de `next dev`.
 * La instancia se recrea si cambió el código de la clase (si no, una versión
 * vieja del repositorio quedaría sin los métodos nuevos).
 */
const globalForRepo = globalThis as unknown as { filoState?: State; filoRepo?: unknown };

export function getMemoryRepository(): MemoryRepository {
  if (globalForRepo.filoState?.version !== STATE_VERSION) {
    const now = nowIn(BUSINESS.timeZone);
    globalForRepo.filoState = {
      version: STATE_VERSION,
      ...buildSeed(now.date, now.minute, ADMIN_STAFF_ID),
      staff: seedStaff(),
      blocked: [],
    };
    globalForRepo.filoRepo = undefined;
  }
  if (globalForRepo.filoRepo instanceof MemoryRepository) return globalForRepo.filoRepo;
  const repo = new MemoryRepository(globalForRepo.filoState);
  globalForRepo.filoRepo = repo;
  return repo;
}
