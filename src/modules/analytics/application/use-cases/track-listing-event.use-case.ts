import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import type { UserRepository } from "../../../identity/domain/repositories";
import { InsightsUnauthorizedError } from "../../domain/errors";
import { InsightsCatalog } from "../../domain/repositories";
import {
  AUTH_TRACKED_EVENTS,
  StatsRepository,
  VIEW_DEDUPE_MS,
  type TrackedEvent,
  type TrafficSource,
} from "../../domain/stats";

const PUBLIC_STATUSES = new Set(["published", "reserved"]);

export interface TrackListingEventInput {
  listingId: string;
  type: TrackedEvent;
  source?: TrafficSource;
  sessionId?: string;
  visitorId?: string;
  area?: string;
  actorId?: string;
}

export class TrackListingEventUseCase implements UseCase<TrackListingEventInput, { recorded: boolean }> {
  private readonly lastView = new Map<string, number>();

  constructor(
    private readonly stats: StatsRepository,
    private readonly catalog: InsightsCatalog,
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: TrackListingEventInput): Promise<{ recorded: boolean }> {
    if ((AUTH_TRACKED_EVENTS as readonly string[]).includes(input.type) && !input.actorId) {
      throw new InsightsUnauthorizedError();
    }

    const listing = await this.catalog.findListing(input.listingId);
    if (!listing || !PUBLIC_STATUSES.has(listing.status)) return { recorded: false };
    if (input.actorId && input.actorId === listing.sellerId) return { recorded: false };

    const at = this.clock.now();
    const visitorId = (input.actorId ?? input.sessionId ?? input.visitorId ?? "anon").slice(0, 64);

    if (input.type === "view") {
      const key = `${listing.id}:${visitorId}`;
      const last = this.lastView.get(key);
      if (last && at.getTime() - last < VIEW_DEDUPE_MS) return { recorded: false };
      this.lastView.set(key, at.getTime());
    }

    const firstView = input.type === "view" ? await this.stats.markViewer(listing.id, visitorId) : false;
    const viewerArea =
      input.type === "view" ? input.area?.trim() || (await this.viewerMunicipality(input.actorId)) : undefined;

    await this.stats.record({
      listingId: listing.id,
      sellerId: listing.sellerId,
      type: input.type,
      source: input.source,
      viewerArea,
      visitorId,
      firstView,
      at,
    });
    return { recorded: true };
  }

  private async viewerMunicipality(actorId?: string): Promise<string | undefined> {
    if (!actorId) return undefined;
    const user = await this.users.findById(actorId);
    return user?.municipality?.trim() || undefined;
  }
}
