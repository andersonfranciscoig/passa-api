import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Response } from "express";

import { DomainError } from "../../domain/domain-error";
import { DomainErrorFilter } from "./domain-error.filter";

/**
 * Prisma e falhas inesperadas viram JSON 500 (não HTML), com código útil em desenvolvimento.
 */
@Catch()
export class UnhandledErrorFilter implements ExceptionFilter {
  private readonly domain = new DomainErrorFilter();
  private readonly log = new Logger(UnhandledErrorFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    if (error instanceof DomainError) {
      this.domain.catch(error, host);
      return;
    }

    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      response.status(status).json(typeof body === "string" ? { statusCode: status, message: body } : body);
      return;
    }
    const prisma = prismaFailure(error);
    this.log.error(error instanceof Error ? error.stack ?? error.message : String(error));

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: prisma?.code ?? "internal",
      message: prisma
        ? "A base de dados rejeitou o pedido. Confirme `npx prisma migrate deploy` e que o PostgreSQL está a correr."
        : "Erro interno do servidor.",
    });
  }
}

function prismaFailure(error: unknown): { code: string } | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return { code: `prisma.${error.code}` };
  if (error instanceof Prisma.PrismaClientInitializationError) return { code: "prisma.init" };
  if (error instanceof Prisma.PrismaClientRustPanicError) return { code: "prisma.panic" };
  if (error instanceof Prisma.PrismaClientUnknownRequestError) return { code: "prisma.unknown" };
  if (error instanceof Prisma.PrismaClientValidationError) return { code: "prisma.validation" };
  return null;
}
