import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  email: text("email").unique(),
  name: text("name"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  userId: text("user_id"),
  title: text("title").notNull(),
  json: text("json", { mode: "json" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const jobDescriptions = sqliteTable("job_descriptions", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  userId: text("user_id"),
  title: text("title").notNull(),
  company: text("company"),
  sourceName: text("source_name"),
  rawText: text("raw_text").notNull(),
  parsed: text("parsed", { mode: "json" }).notNull(),
  embedding: text("embedding", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const atsScores = sqliteTable("ats_scores", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  resumeId: text("resume_id").notNull(),
  jdId: text("jd_id").notNull(),
  overall: integer("overall").notNull(),
  breakdown: text("breakdown", { mode: "json" }).notNull(),
  suggestions: text("suggestions", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const coverLetters = sqliteTable("cover_letters", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  userId: text("user_id"),
  resumeId: text("resume_id").notNull(),
  jdId: text("jd_id").notNull(),
  tone: text("tone").notNull(),
  contentMd: text("content_md").notNull(),
  version: integer("version").default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  type: text("type").notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  status: text("status").default("pending"),
  artifacts: text("artifacts", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobDescriptionSchema = createInsertSchema(jobDescriptions).omit({
  id: true,
  createdAt: true,
});

export const insertCoverLetterSchema = createInsertSchema(coverLetters).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Resume = typeof resumes.$inferSelect;
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type JobDescription = typeof jobDescriptions.$inferSelect;
export type InsertJobDescription = z.infer<typeof insertJobDescriptionSchema>;
export type CoverLetter = typeof coverLetters.$inferSelect;
export type InsertCoverLetter = z.infer<typeof insertCoverLetterSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type ATSScore = typeof atsScores.$inferSelect;

// Resume JSON structure
export const resumeJsonSchema = z.object({
  personalInfo: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    website: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
  }),
  summary: z.string(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    startDate: z.string(),
    endDate: z.string(),
    bullets: z.array(z.string()),
  })),
  skills: z.record(z.string(), z.array(z.string())),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string(),
    location: z.string().optional(),
    graduation: z.string(),
    gpa: z.string().optional(),
  })).optional(),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    technologies: z.array(z.string()).optional(),
    url: z.string().optional(),
  })).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
    url: z.string().optional(),
  })).optional(),
  achievements: z.array(z.string()).optional(),
});

export type ResumeJson = z.infer<typeof resumeJsonSchema>;
