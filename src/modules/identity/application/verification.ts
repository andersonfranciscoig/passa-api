export const MIN_ACCOUNT_AGE_DAYS = 7;
export const MIN_PUBLISHED_LISTINGS = 3;

export interface VerificationInput {
  displayName: string;
  hasBio: boolean;
  phoneVerified: boolean;
  accountAgeDays: number;
  publishedListings: number;
  moderatedListings: number;
}

export interface VerificationItem {
  id: string;
  label: string;
  hint: string;
  done: boolean;
}

export interface VerificationStatus {
  verified: boolean;
  items: VerificationItem[];
  completed: number;
}

export function verificationStatus(i: VerificationInput): VerificationStatus {
  const items: VerificationItem[] = [
    { id: "phone", label: "Telemóvel confirmado", hint: "Confirme o número com o código enviado para o seu email.", done: i.phoneVerified },
    { id: "full_name", label: "Nome e apelido", hint: "Use o nome pelo qual as pessoas o conhecem.", done: i.displayName.trim().split(/\s+/).length >= 2 },
    { id: "bio", label: "Apresentação no perfil", hint: "Conte em poucas palavras o que costuma anunciar.", done: i.hasBio },
    { id: "account_age", label: `Conta com ${MIN_ACCOUNT_AGE_DAYS} dias`, hint: "A confiança constrói-se com o tempo.", done: i.accountAgeDays >= MIN_ACCOUNT_AGE_DAYS },
    { id: "listings", label: `${MIN_PUBLISHED_LISTINGS} anúncios publicados`, hint: "Rascunhos não contam.", done: i.publishedListings >= MIN_PUBLISHED_LISTINGS },
    { id: "clean_record", label: "Sem anúncios removidos", hint: "Nenhum anúncio removido pela moderação.", done: i.moderatedListings === 0 },
  ];
  const completed = items.filter((x) => x.done).length;
  return { verified: completed === items.length, items, completed };
}
