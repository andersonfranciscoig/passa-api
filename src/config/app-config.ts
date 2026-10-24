import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória."),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET deve ter pelo menos 32 caracteres."),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(28_800),
  EMAIL_PROVIDER: z.enum(["brevo", "console"]).default("console"),
  EMAIL_FROM: z.string().email().default("noreply@passa.ao"),
  EMAIL_FROM_NAME: z.string().min(1).default("PASSA"),
  EMAIL_REPLY_TO: z.string().email().default("noreply@passa.ao"),
  EMAIL_API_KEY: z.string().optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  STORAGE_PROVIDER: z.enum(["uploadthing", "memory"]).default("memory"),
  UPLOADTHING_TOKEN: z.string().optional(),
  UPLOADTHING_ACL: z.enum(["public-read", "private"]).default("public-read"),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().max(16_777_216).default(5_242_880),
})
  .refine((env) => env.STORAGE_PROVIDER !== "uploadthing" || Boolean(env.UPLOADTHING_TOKEN), {
    path: ["UPLOADTHING_TOKEN"],
    message: "Defina UPLOADTHING_TOKEN (ou use STORAGE_PROVIDER=memory).",
  });

export class AppConfig {
  readonly env: "development" | "test" | "production";
  readonly port: number;
  readonly databaseUrl: string;
  readonly corsOrigins: string[];
  readonly frontendUrl: string;
  readonly jwtAccessSecret: string;
  readonly jwtAccessTtlSeconds: number;
  readonly email: {
    provider: "brevo" | "console";
    from: string;
    fromName: string;
    replyTo: string;
    apiKey?: string;
    adminNotify?: string;
  };
  readonly storage: {
    provider: "uploadthing" | "memory";
    uploadthingToken?: string;
    private: boolean;
    maxBytes: number;
  };

  constructor(source: Record<string, string | undefined> = process.env) {
    const parsed = schema.safeParse(source);
    if (!parsed.success) {
      const problems = parsed.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
      throw new Error(`Configuração inválida:\n${problems.join("\n")}`);
    }
    const env = parsed.data;
    this.env = env.NODE_ENV;
    this.port = env.PORT;
    this.databaseUrl = env.DATABASE_URL;
    this.corsOrigins = env.CORS_ORIGINS;
    this.frontendUrl = env.FRONTEND_URL.replace(/\/$/, "");
    this.jwtAccessSecret = env.JWT_ACCESS_SECRET;
    this.jwtAccessTtlSeconds = env.JWT_ACCESS_TTL_SECONDS;
    this.email = {
      provider: env.EMAIL_PROVIDER,
      from: env.EMAIL_FROM,
      fromName: env.EMAIL_FROM_NAME,
      replyTo: env.EMAIL_REPLY_TO,
      apiKey: env.EMAIL_API_KEY,
      adminNotify: env.SEED_ADMIN_EMAIL,
    };
    this.storage = {
      provider: env.STORAGE_PROVIDER,
      uploadthingToken: env.UPLOADTHING_TOKEN,
      private: env.UPLOADTHING_ACL === "private",
      maxBytes: env.UPLOAD_MAX_BYTES,
    };
  }
}
