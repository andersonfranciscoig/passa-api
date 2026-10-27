import type { UseCase } from "../../../../shared/application/use-case";
import type { Clock } from "../../../../shared/domain/clock";
import type { IdGenerator } from "../../../../shared/domain/id-generator";
import { TrackListingEventUseCase } from "../../../analytics/application/use-cases/track-listing-event.use-case";
import { PUBLIC_LISTING_STATUSES, type Conversation } from "../../domain/conversation";
import { ConversationListingNotFoundError, ConversationOwnListingError } from "../../domain/errors";
import { ConversationRepository, MessagingListingCatalog } from "../../domain/repositories";
import { toConversationView } from "../conversation-view";

export interface StartConversationInput {
  buyerId: string;
  listingId: string;
}

export class StartConversationUseCase implements UseCase<StartConversationInput, ReturnType<typeof toConversationView>> {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly listings: MessagingListingCatalog,
    private readonly track: TrackListingEventUseCase,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: StartConversationInput) {
    const listing = await this.listings.find(input.listingId);
    if (!listing || !PUBLIC_LISTING_STATUSES.has(listing.status)) {
      throw new ConversationListingNotFoundError();
    }
    if (listing.sellerId === input.buyerId) throw new ConversationOwnListingError();

    const existing = await this.conversations.findByListingAndBuyer(input.listingId, input.buyerId);
    if (existing) return toConversationView(existing);

    const now = this.clock.now();
    const conversation: Conversation = {
      id: this.ids.next(),
      listingId: input.listingId,
      buyerId: input.buyerId,
      sellerId: listing.sellerId,
      createdAt: now,
      lastMessageAt: now,
    };
    const created = await this.conversations.create(conversation);
    if (created) {
      await this.track.execute({ listingId: input.listingId, type: "chat", actorId: input.buyerId });
      return toConversationView(conversation);
    }
    const raced = await this.conversations.findByListingAndBuyer(input.listingId, input.buyerId);
    return toConversationView(raced ?? conversation);
  }
}
