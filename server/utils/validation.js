import { z } from "zod";

const projectStatuses = ["planejamento", "em_andamento", "concluido", "arquivado"];
const taskStatuses = ["a_fazer", "em_andamento", "em_revisao", "concluida"];
const priorities = ["baixa", "media", "alta", "urgente"];
const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default("")
};

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Informe uma data válida.")
  .nullable()
  .optional();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72)
});

const projectFields = {
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  status: z.enum(projectStatuses).default("planejamento"),
  priority: z.enum(priorities).default("media"),
  dueDate: optionalDate
};

export const createProjectSchema = z.object(projectFields);
export const updateProjectSchema = z.object({
  name: projectFields.name.optional(),
  description: projectFields.description.optional(),
  status: projectFields.status.optional(),
  priority: projectFields.priority.optional(),
  dueDate: optionalDate
}).refine((fields) => Object.keys(fields).length > 0, "Informe ao menos um campo para atualizar.");

const taskFields = {
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).default(""),
  status: z.enum(taskStatuses).default("a_fazer"),
  priority: z.enum(priorities).default("media"),
  dueDate: optionalDate
};

export const createTaskSchema = z.object(taskFields);
export const updateTaskSchema = z.object({
  title: taskFields.title.optional(),
  description: taskFields.description.optional(),
  status: taskFields.status.optional(),
  priority: taskFields.priority.optional(),
  dueDate: optionalDate
}).refine((fields) => Object.keys(fields).length > 0, "Informe ao menos um campo para atualizar.");

export const projectListQuerySchema = z.object({
  ...paginationFields,
  status: z.enum(projectStatuses).optional()
});

export const taskListQuerySchema = z.object({
  ...paginationFields,
  status: z.enum(taskStatuses).optional(),
  sort: z.enum(["dueDate", "priority", "updatedAt"]).default("updatedAt")
});

export const uuidSchema = z.string().uuid();
