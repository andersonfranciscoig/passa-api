import { describe, expect, it } from "vitest";

import { FixedClock } from "../../../shared/testing/fixed-clock";
import { SequentialIdGenerator } from "../../../shared/testing/sequential-id";
import { BetaInviteRequiredError } from "../domain/errors";
import {
  InMemoryBetaInviteRepository,
  InMemoryBetaSettingsRepository,
  SilentInviteNotifier,
} from "../infrastructure/in-memory-beta-repositories";
import { BetaAccessPolicyService } from "./beta-access-policy.service";
import { GetAccessUseCase } from "./use-cases/get-access.use-case";
import { InviteUseCase } from "./use-cases/invite.use-case";
import { RevokeInviteUseCase } from "./use-cases/revoke-invite.use-case";
import { SetClosedBetaUseCase } from "./use-cases/set-closed-beta.use-case";

const setup = () => {
  const invites = new InMemoryBetaInviteRepository();
  const settings = new InMemoryBetaSettingsRepository();
  const notifier = new SilentInviteNotifier();
  const clock = new FixedClock();
  const ids = new SequentialIdGenerator();
  const access = new GetAccessUseCase(settings, invites);
  return {
    invites,
    settings,
    notifier,
    access,
    invite: new InviteUseCase(invites, notifier, clock, ids),
    revoke: new RevokeInviteUseCase(invites, clock),
    setClosed: new SetClosedBetaUseCase(settings, clock),
    policy: new BetaAccessPolicyService(settings, invites, access, () => clock.now()),
  };
};

describe("Beta fechado", () => {
  it("visitantes não entram; administradores sim", async () => {
    const { access } = setup();
    expect(await access.execute(null)).toEqual({ closedBeta: true, allowed: false, signedIn: false });
    expect(await access.execute({ id: "admin", isAdmin: true, email: "admin@passa.ao" })).toMatchObject({
      allowed: true,
    });
  });

  it("convidar permite o registo com o mesmo contacto", async () => {
    const { invite, policy } = setup();
    await expect(policy.assertCanRegister({ email: "nova@exemplo.ao" })).rejects.toBeInstanceOf(BetaInviteRequiredError);
    const r = await invite.execute({
      actorId: "admin",
      people: [{ email: "nova@exemplo.ao", name: "Nova Pessoa" }],
    });
    expect(r).toEqual({ created: 1, skipped: 0 });
    await policy.assertCanRegister({ email: "nova@exemplo.ao" });
    await policy.markRegistered("user-1", { email: "nova@exemplo.ao" });
    expect((await policy.currentAccess({ id: "user-1", isAdmin: false, email: "nova@exemplo.ao" })).allowed).toBe(true);
  });

  it("não cria convites duplicados", async () => {
    const { invite } = setup();
    await invite.execute({ actorId: "admin", people: [{ email: "joana@passa.ao" }] });
    const r = await invite.execute({
      actorId: "admin",
      people: [{ email: "joana@passa.ao" }, { phone: "244911222333" }, { phone: "911 222 333" }],
    });
    expect(r).toEqual({ created: 1, skipped: 2 });
  });

  it("retirar acesso bloqueia; terminar o beta abre a todos", async () => {
    const { invite, revoke, setClosed, access, invites } = setup();
    const created = await invite.execute({ actorId: "admin", people: [{ email: "joana@passa.ao" }] });
    expect(created.created).toBe(1);
    const [only] = await invites.list();
    await revoke.execute(only.id);
    expect(
      (await access.execute({ id: "u1", isAdmin: false, email: "joana@passa.ao" })).allowed,
    ).toBe(false);
    await setClosed.execute({ actorId: "admin", closed: false });
    expect((await access.execute(null)).allowed).toBe(true);
  });
});
