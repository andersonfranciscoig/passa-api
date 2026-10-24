import { ValidationError } from "./domain-error";

/** Número de telemóvel angolano no formato E.164 sem "+" (ex.: 244923456789). */
export type AngolanPhone = string & { readonly __brand: "AngolanPhone" };

export function createAngolanPhone(raw: string, field = "phone"): AngolanPhone {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00244")) digits = digits.slice(5);
  else if (digits.startsWith("244")) digits = digits.slice(3);
  if (!/^9\d{8}$/.test(digits)) {
    throw new ValidationError("Indique um número de telemóvel angolano válido (ex.: 923 456 789).", field);
  }
  return `244${digits}` as AngolanPhone;
}

/** 244923456789 → "+244 923 456 789" */
export function formatPhone(phone: string): string {
  const local = phone.startsWith("244") ? phone.slice(3) : phone;
  return `+244 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
