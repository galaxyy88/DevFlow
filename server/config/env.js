import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória."),
  JWT_SECRET: z.string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres.")
    .refine((secret) => !/^(example-only|replace-with|change-me|your-secret)/i.test(secret), {
      message: "JWT_SECRET não pode ser um valor de exemplo."
    }),
  JWT_EXPIRES_IN: z.enum(["15m", "30m", "1h", "2h", "4h", "8h"]).default("1h"),
  DB_SSL: z.enum(["true", "false"]).default("false")
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Configuração inválida:", parsedEnvironment.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsedEnvironment.data,
  DB_SSL: parsedEnvironment.data.DB_SSL === "true"
};
