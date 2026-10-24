/**
 * Contrato entre identidade e beta. Identity não conhece o módulo beta;
 * beta implementa esta política e o composition root liga as peças.
 */
export abstract class BetaAccessPolicy {
  abstract assertCanRegister(who: { email?: string; phone?: string }): Promise<void>;
  abstract markRegistered(userId: string, who: { email?: string; phone?: string }): Promise<void>;
  abstract currentAccess(user: CurrentAccessUser | null): Promise<CurrentAccess>;
}

export interface CurrentAccessUser {
  id: string;
  isAdmin: boolean;
  email?: string;
  phone?: string;
}

export interface CurrentAccess {
  closedBeta: boolean;
  allowed: boolean;
  signedIn: boolean;
}
