import { describe, expect, it } from "vitest";

import { FixedClock } from "../../../shared/testing/fixed-clock";
import { SequentialIdGenerator } from "../../../shared/testing/sequential-id";
import { LastSeenTracker } from "../../identity/application/last-seen-tracker";
import { AccountNotFoundError } from "../../identity/domain/errors";
import type { User } from "../../identity/domain/user";
import { InMemoryUserRepository } from "../../identity/infrastructure/in-memory-user.repository";
import {
  CannotLikeOwnProfileError,
  CannotReviewOwnProfileError,
  InvalidRatingError,
  InvalidReviewCommentError,
  ProfileAlreadyReviewedError,
} from "../domain/errors";
import {
  InMemoryProfileLikeRepository,
  InMemoryProfileListingCatalog,
  InMemoryProfileReviewRepository,
  InMemoryProfileViewRepository,
} from "../infrastructure/in-memory-profile.repositories";
import { CreateProfileReviewUseCase } from "./use-cases/create-profile-review.use-case";
import { GetProfileStatsUseCase } from "./use-cases/get-profile-stats.use-case";
import { GetPublicProfileUseCase } from "./use-cases/get-public-profile.use-case";
import { LikeProfileUseCase, UnlikeProfileUseCase } from "./use-cases/like-profile.use-case";
import { ListProfileReviewsUseCase } from "./use-cases/list-profile-reviews.use-case";
import { profileViewerKey, RecordProfileViewUseCase } from "./use-cases/record-profile-view.use-case";

const NOW = new Date("2026-10-30T10:00:00.000Z");
const SELLER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BUYER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SUSPENDED = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function user(id: string, extra: Partial<User> = {}): User {
  return {
    id,
    email: `${id}@passa.ao`,
    passwordHash: "x",
    displayName: extra.displayName ?? "Ana Silva",
    province: "Luanda",
    municipality: "Ingombota",
    role: "USER",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...extra,
  };
}

function setup() {
  const clock = new FixedClock(NOW);
  const users = new InMemoryUserRepository([
    user(SELLER, { lastSeenAt: new Date("2026-10-30T09:55:00.000Z") }),
    user(BUYER, { displayName: "Mauro Costa", avatarUrl: "https://utfs.io/f/mauro.jpg" }),
    user(OTHER, { displayName: "Joana Neto" }),
    user(SUSPENDED, { status: "SUSPENDED" }),
  ]);
  const reviews = new InMemoryProfileReviewRepository(users);
  const likes = new InMemoryProfileLikeRepository();
  const views = new InMemoryProfileViewRepository();
  const listings = new InMemoryProfileListingCatalog();
  return {
    clock,
    users,
    reviews,
    likes,
    views,
    profile: new GetPublicProfileUseCase(users, reviews, likes, listings),
    listReviews: new ListProfileReviewsUseCase(users, reviews),
    createReview: new CreateProfileReviewUseCase(users, reviews, clock, new SequentialIdGenerator()),
    like: new LikeProfileUseCase(users, likes, clock),
    unlike: new UnlikeProfileUseCase(users, likes),
    recordView: new RecordProfileViewUseCase(users, views, clock),
    stats: new GetProfileStatsUseCase(views, likes, reviews, clock),
  };
}

describe("Avaliações de perfil", () => {
  it("cria a avaliação com comentário aparado e devolve o autor", async () => {
    const { createReview } = setup();
    const view = await createReview.execute({ profileUserId: SELLER, authorId: BUYER, rating: 5, comment: "  Muito bom!  " });
    expect(view).toMatchObject({
      rating: 5,
      comment: "Muito bom!",
      createdAt: NOW.toISOString(),
      author: { id: BUYER, displayName: "Mauro Costa", avatarUrl: "https://utfs.io/f/mauro.jpg" },
    });
  });

  it("comentário vazio passa a null", async () => {
    const { createReview } = setup();
    const view = await createReview.execute({ profileUserId: SELLER, authorId: BUYER, rating: 4, comment: "   " });
    expect(view.comment).toBeNull();
  });

  it("não deixa avaliar o próprio perfil", async () => {
    const { createReview, reviews } = setup();
    await expect(createReview.execute({ profileUserId: SELLER, authorId: SELLER, rating: 5 })).rejects.toBeInstanceOf(
      CannotReviewOwnProfileError,
    );
    expect(reviews.items).toHaveLength(0);
  });

  it("só uma avaliação por autor e perfil", async () => {
    const { createReview, reviews } = setup();
    await createReview.execute({ profileUserId: SELLER, authorId: BUYER, rating: 5 });
    await expect(createReview.execute({ profileUserId: SELLER, authorId: BUYER, rating: 3 })).rejects.toBeInstanceOf(
      ProfileAlreadyReviewedError,
    );
    expect(reviews.items).toHaveLength(1);
  });

  it("a avaliação tem de ser um inteiro de 1 a 5", async () => {
    const { createReview } = setup();
    for (const rating of [0, 6, 3.5, -1]) {
      await expect(createReview.execute({ profileUserId: SELLER, authorId: BUYER, rating })).rejects.toBeInstanceOf(
        InvalidRatingError,
      );
    }
    await expect(createReview.execute({ profileUserId: SELLER, authorId: BUYER, rating: 1 })).resolves.toMatchObject({ rating: 1 });
    await expect(createReview.execute({ profileUserId: SELLER, authorId: OTHER, rating: 5 })).resolves.toMatchObject({ rating: 5 });
  });

  it("comentário com mais de 500 caracteres é rejeitado", async () => {
    const { createReview } = setup();
    await expect(
      createReview.execute({ profileUserId: SELLER, authorId: BUYER, rating: 4, comment: "a".repeat(501) }),
    ).rejects.toBeInstanceOf(InvalidReviewCommentError);
  });

  it("perfil inexistente ou suspenso dá conta não encontrada", async () => {
    const { createReview, listReviews } = setup();
    await expect(createReview.execute({ profileUserId: "missing", authorId: BUYER, rating: 5 })).rejects.toBeInstanceOf(
      AccountNotFoundError,
    );
    await expect(createReview.execute({ profileUserId: SUSPENDED, authorId: BUYER, rating: 5 })).rejects.toBeInstanceOf(
      AccountNotFoundError,
    );
    await expect(listReviews.execute({ profileUserId: SUSPENDED })).rejects.toBeInstanceOf(AccountNotFoundError);
  });

  it("lista as mais recentes primeiro, com média arredondada e distribuição", async () => {
    const { createReview, listReviews, clock } = setup();
    await createReview.execute({ profileUserId: SELLER, authorId: BUYER, rating: 5 });
    clock.set(new Date("2026-10-30T11:00:00.000Z"));
    await createReview.execute({ profileUserId: SELLER, authorId: OTHER, rating: 4 });

    const page = await listReviews.execute({ profileUserId: SELLER, page: 1, pageSize: 1 });
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].author.id).toBe(OTHER);
    expect(page.average).toBe(4.5);
    expect(page.distribution).toEqual({ "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 });

    const capped = await listReviews.execute({ profileUserId: SELLER, pageSize: 500 });
    expect(capped.pageSize).toBe(50);
  });

  it("sem avaliações a média é null", async () => {
    const { listReviews } = setup();
    const page = await listReviews.execute({ profileUserId: SELLER });
    expect(page).toMatchObject({ items: [], total: 0, page: 1, pageSize: 10, average: null });
  });
});

describe("Gostos de perfil", () => {
  it("gostar é idempotente", async () => {
    const { like, likes } = setup();
    expect(await like.execute({ profileUserId: SELLER, userId: BUYER })).toEqual({ likes: 1, likedByMe: true });
    expect(await like.execute({ profileUserId: SELLER, userId: BUYER })).toEqual({ likes: 1, likedByMe: true });
    expect(likes.items).toHaveLength(1);
  });

  it("retirar o gosto é idempotente", async () => {
    const { like, unlike } = setup();
    await like.execute({ profileUserId: SELLER, userId: BUYER });
    await like.execute({ profileUserId: SELLER, userId: OTHER });
    expect(await unlike.execute({ profileUserId: SELLER, userId: BUYER })).toEqual({ likes: 1, likedByMe: false });
    expect(await unlike.execute({ profileUserId: SELLER, userId: BUYER })).toEqual({ likes: 1, likedByMe: false });
  });

  it("não deixa gostar do próprio perfil", async () => {
    const { like, unlike } = setup();
    await expect(like.execute({ profileUserId: SELLER, userId: SELLER })).rejects.toBeInstanceOf(CannotLikeOwnProfileError);
    await expect(unlike.execute({ profileUserId: SELLER, userId: SELLER })).rejects.toBeInstanceOf(CannotLikeOwnProfileError);
  });
});

describe("Perfil público", () => {
  it("anónimo: sem gosto, sem avaliação própria e sem poder avaliar", async () => {
    const { profile } = setup();
    const view = await profile.execute({ profileUserId: SELLER });
    expect(view).toMatchObject({
      id: SELLER,
      lastSeenAt: "2026-10-30T09:55:00.000Z",
      rating: { average: null, count: 0 },
      likes: 0,
      likedByMe: false,
      myReview: null,
      canReview: false,
    });
  });

  it("autenticado: reflete o próprio gosto e a própria avaliação", async () => {
    const { profile, like, createReview } = setup();
    expect((await profile.execute({ profileUserId: SELLER, viewerId: BUYER })).canReview).toBe(true);
    await like.execute({ profileUserId: SELLER, userId: BUYER });
    await createReview.execute({ profileUserId: SELLER, authorId: BUYER, rating: 4, comment: "Bom" });
    const view = await profile.execute({ profileUserId: SELLER, viewerId: BUYER });
    expect(view.likedByMe).toBe(true);
    expect(view.likes).toBe(1);
    expect(view.rating).toEqual({ average: 4, count: 1 });
    expect(view.myReview).toMatchObject({ rating: 4, comment: "Bom", author: { id: BUYER } });
    expect(view.canReview).toBe(false);
  });

  it("o dono não pode avaliar o próprio perfil", async () => {
    const { profile } = setup();
    const view = await profile.execute({ profileUserId: SELLER, viewerId: SELLER });
    expect(view.canReview).toBe(false);
    expect(view.myReview).toBeNull();
  });

  it("sem atividade registada, lastSeenAt é null", async () => {
    const { profile } = setup();
    expect((await profile.execute({ profileUserId: BUYER })).lastSeenAt).toBeNull();
  });

  it("suspenso ou inexistente dá conta não encontrada", async () => {
    const { profile } = setup();
    await expect(profile.execute({ profileUserId: SUSPENDED })).rejects.toBeInstanceOf(AccountNotFoundError);
    await expect(profile.execute({ profileUserId: "missing" })).rejects.toBeInstanceOf(AccountNotFoundError);
  });
});

describe("Visitas ao perfil", () => {
  it("o mesmo visitante conta uma vez por dia", async () => {
    const { recordView, views, clock } = setup();
    expect(await recordView.execute({ profileUserId: SELLER, viewerId: BUYER })).toEqual({ recorded: true });
    expect(await recordView.execute({ profileUserId: SELLER, viewerId: BUYER })).toEqual({ recorded: false });
    expect(await recordView.execute({ profileUserId: SELLER, ip: "1.2.3.4", userAgent: "UA" })).toEqual({ recorded: true });
    expect(await recordView.execute({ profileUserId: SELLER, ip: "1.2.3.4", userAgent: "UA" })).toEqual({ recorded: false });
    expect(await views.dailyViews(SELLER, "2026-10-30", "2026-10-30")).toEqual([{ day: "2026-10-30", views: 2 }]);

    clock.set(new Date("2026-10-31T10:00:00.000Z"));
    expect(await recordView.execute({ profileUserId: SELLER, viewerId: BUYER })).toEqual({ recorded: true });
  });

  it("o dono a ver o próprio perfil não conta", async () => {
    const { recordView, views } = setup();
    expect(await recordView.execute({ profileUserId: SELLER, viewerId: SELLER })).toEqual({ recorded: false });
    expect(views.viewers.size).toBe(0);
  });

  it("perfil inexistente dá conta não encontrada", async () => {
    const { recordView } = setup();
    await expect(recordView.execute({ profileUserId: "missing", viewerId: BUYER })).rejects.toBeInstanceOf(AccountNotFoundError);
  });

  it("chave anónima: hash estável de IP + user-agent, até 64 caracteres", () => {
    const a = profileViewerKey({ ip: "1.2.3.4", userAgent: "UA" });
    expect(a).toBe(profileViewerKey({ ip: "1.2.3.4", userAgent: "UA" }));
    expect(a).not.toBe(profileViewerKey({ ip: "1.2.3.5", userAgent: "UA" }));
    expect(a.startsWith("anon:")).toBe(true);
    expect(a.length).toBeLessThanOrEqual(64);
    expect(profileViewerKey({ viewerId: BUYER, ip: "1.2.3.4" })).toBe(BUYER);
  });
});

describe("Estatísticas do perfil", () => {
  it("preenche com zeros um registo por dia, do mais antigo para o mais recente", async () => {
    const { recordView, stats, clock, like, createReview } = setup();
    clock.set(new Date("2026-10-25T10:00:00.000Z"));
    await recordView.execute({ profileUserId: SELLER, viewerId: BUYER });
    clock.set(new Date("2026-10-30T10:00:00.000Z"));
    await recordView.execute({ profileUserId: SELLER, viewerId: BUYER });
    await recordView.execute({ profileUserId: SELLER, viewerId: OTHER });
    await like.execute({ profileUserId: SELLER, userId: BUYER });
    await createReview.execute({ profileUserId: SELLER, authorId: BUYER, rating: 5 });
    await createReview.execute({ profileUserId: SELLER, authorId: OTHER, rating: 4 });

    const week = await stats.execute({ userId: SELLER, days: 7 });
    expect(week.days).toBe(7);
    expect(week.daily).toHaveLength(7);
    expect(week.daily[0]).toEqual({ day: "2026-10-24", views: 0 });
    expect(week.daily[1]).toEqual({ day: "2026-10-25", views: 1 });
    expect(week.daily[6]).toEqual({ day: "2026-10-30", views: 2 });
    expect(week.daily.slice(2, 6).every((d) => d.views === 0)).toBe(true);
    expect(week.totalViews).toBe(3);
    expect(week.uniqueViewers).toBe(2);
    expect(week.likes).toBe(1);
    expect(week.rating).toEqual({ average: 4.5, count: 2 });
  });

  it("por omissão usa 30 dias e ignora valores fora de 7/30/90", async () => {
    const { stats } = setup();
    const def = await stats.execute({ userId: SELLER });
    expect(def.days).toBe(30);
    expect(def.daily).toHaveLength(30);
    expect(def.daily[29].day).toBe("2026-10-30");
    expect(def.totalViews).toBe(0);
    expect((await stats.execute({ userId: SELLER, days: 90 })).daily).toHaveLength(90);
    expect((await stats.execute({ userId: SELLER, days: 12 })).days).toBe(30);
  });
});

describe("Última vez visto", () => {
  it("escreve no máximo a cada 2 minutos e o login força a escrita", async () => {
    const clock = new FixedClock(NOW);
    const users = new InMemoryUserRepository([user(BUYER)]);
    const tracker = new LastSeenTracker(users, clock);

    await tracker.touch(BUYER);
    expect((await users.findById(BUYER))?.lastSeenAt).toEqual(NOW);

    clock.set(new Date(NOW.getTime() + 60_000));
    await tracker.touch(BUYER);
    expect((await users.findById(BUYER))?.lastSeenAt).toEqual(NOW);

    clock.set(new Date(NOW.getTime() + 90_000));
    await tracker.touch(BUYER, { force: true });
    expect((await users.findById(BUYER))?.lastSeenAt).toEqual(new Date(NOW.getTime() + 90_000));

    clock.set(new Date(NOW.getTime() + 5 * 60_000));
    await tracker.touch(BUYER);
    expect((await users.findById(BUYER))?.lastSeenAt).toEqual(new Date(NOW.getTime() + 5 * 60_000));
  });

  it("uma falha a gravar nunca é lançada", async () => {
    const clock = new FixedClock(NOW);
    const users = new InMemoryUserRepository([user(BUYER)]);
    users.touchLastSeen = async () => {
      throw new Error("db down");
    };
    await expect(new LastSeenTracker(users, clock).touch(BUYER)).resolves.toBeUndefined();
  });
});
