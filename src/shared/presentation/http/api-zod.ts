import { applyDecorators } from "@nestjs/common";
import { ApiBody, type SchemaObject } from "@nestjs/swagger";
import { z, type ZodType } from "zod";

function toOpenApiSchema(schema: ZodType): SchemaObject {
  return z.toJSONSchema(schema, {
    target: "openapi-3.0",
    io: "input",
    unrepresentable: "any",
  }) as SchemaObject;
}

export function ApiZodBody(schema: ZodType, example?: unknown): MethodDecorator {
  return applyDecorators(
    ApiBody({
      schema: toOpenApiSchema(schema),
      required: true,
      ...(example ? { examples: { exemplo: { value: example } } } : {}),
    }),
  );
}
