import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória."),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter pelo menos 32 caracteres."),
  JWT_EXPIRES_IN: z.string().default("1h"),
  CLIENT_ORIGINS: z.string().default("http://localhost:3000"),
  RENDER_EXTERNAL_URL: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().url().optional()
  ),
  DB_SSL: z.enum(["true", "false"]).default("false")
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Configuração inválida:", parsedEnvironment.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsedEnvironment.data,
  CLIENT_ORIGINS: parsedEnvironment.data.CLIENT_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .concat(parsedEnvironment.data.RENDER_EXTERNAL_URL
      ? [new URL(parsedEnvironment.data.RENDER_EXTERNAL_URL).origin]
      : []),
  DB_SSL: parsedEnvironment.data.DB_SSL === "true"
};
