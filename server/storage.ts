import { 
  User, InsertUser, Resume, InsertResume, JobDescription, InsertJobDescription,
  CoverLetter, InsertCoverLetter, Job, InsertJob, ATSScore
} from "@shared/schema";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Resumes
  getResume(id: string): Promise<Resume | undefined>;
  getResumesByUser(userId: string): Promise<Resume[]>;
  createResume(resume: InsertResume): Promise<Resume>;
  updateResume(id: string, resume: Partial<InsertResume>): Promise<Resume>;
  deleteResume(id: string): Promise<void>;

  // Job Descriptions
  getJobDescription(id: string): Promise<JobDescription | undefined>;
  getJobDescriptionsByUser(userId: string): Promise<JobDescription[]>;
  createJobDescription(jd: InsertJobDescription): Promise<JobDescription>;
  deleteJobDescription(id: string): Promise<void>;

  // Cover Letters
  getCoverLetter(id: string): Promise<CoverLetter | undefined>;
  getCoverLettersByUser(userId: string): Promise<CoverLetter[]>;
  createCoverLetter(letter: InsertCoverLetter): Promise<CoverLetter>;
  updateCoverLetter(id: string, updates: Partial<InsertCoverLetter & { content?: string; lastImproved?: string }>): Promise<CoverLetter>;
  deleteCoverLetter(id: string): Promise<void>;
  deleteAllCoverLetters(userId: string): Promise<number>;

  // Jobs
  getJob(id: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJobStatus(id: string, status: string, artifacts?: any): Promise<Job>;

  // ATS Scores
  getATSScore(resumeId: string, jdId: string): Promise<ATSScore | undefined>;
  saveATSScore(score: Omit<ATSScore, "id">): Promise<ATSScore>;
}

export class SQLiteStorage implements IStorage {
  private db: Database.Database;

  constructor(dbPath = "./data.db") {
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables() {
    // Create tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        email TEXT UNIQUE,
        name TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT,
        title TEXT NOT NULL,
        json TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS job_descriptions (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT,
        title TEXT NOT NULL,
        company TEXT,
        source_name TEXT,
        raw_text TEXT NOT NULL,
        parsed TEXT NOT NULL,
        embedding TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS ats_scores (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        resume_id TEXT NOT NULL,
        jd_id TEXT NOT NULL,
        overall INTEGER NOT NULL,
        breakdown TEXT NOT NULL,
        suggestions TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()),
        UNIQUE(resume_id, jd_id)
      );

      CREATE TABLE IF NOT EXISTS cover_letters (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT,
        resume_id TEXT NOT NULL,
        jd_id TEXT NOT NULL,
        tone TEXT NOT NULL,
        content_md TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        artifacts TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);
  }

  async getUser(id: string): Promise<User | undefined> {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    return row ? { ...row, createdAt: new Date(row.created_at * 1000) } : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const row = this.db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    return row ? { ...row, createdAt: new Date(row.created_at * 1000) } : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare("INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)")
      .run(id, user.email, user.name, now);
    return { id, ...user, createdAt: new Date(now * 1000) };
  }

  async getResume(id: string): Promise<Resume | undefined> {
    const row = this.db.prepare("SELECT * FROM resumes WHERE id = ?").get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      json: JSON.parse(row.json),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000)
    };
  }

  async getResumesByUser(userId: string): Promise<Resume[]> {
    const rows = this.db.prepare("SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as any[];
    return rows.map(row => ({
      ...row,
      json: JSON.parse(row.json),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000)
    }));
  }

  async createResume(resume: InsertResume): Promise<Resume> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare("INSERT INTO resumes (id, user_id, title, json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, resume.userId, resume.title, JSON.stringify(resume.json), now, now);
    return { id, ...resume, createdAt: new Date(now * 1000), updatedAt: new Date(now * 1000) };
  }

  async updateResume(id: string, resume: Partial<InsertResume>): Promise<Resume> {
    const now = Math.floor(Date.now() / 1000);
    const updates: string[] = [];
    const values: any[] = [];

    if (resume.title !== undefined) {
      updates.push("title = ?");
      values.push(resume.title);
    }
    if (resume.json !== undefined) {
      updates.push("json = ?");
      values.push(JSON.stringify(resume.json));
    }
    updates.push("updated_at = ?");
    values.push(now);
    values.push(id);

    this.db.prepare(`UPDATE resumes SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    return this.getResume(id) as Promise<Resume>;
  }

  async deleteResume(id: string): Promise<void> {
    this.db.prepare("DELETE FROM resumes WHERE id = ?").run(id);
  }

  async getJobDescription(id: string): Promise<JobDescription | undefined> {
    const row = this.db.prepare("SELECT * FROM job_descriptions WHERE id = ?").get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      company: row.company,
      sourceName: row.source_name,
      rawText: row.raw_text,  // Map from snake_case to camelCase
      parsed: JSON.parse(row.parsed),
      embedding: row.embedding ? JSON.parse(row.embedding) : null,
      createdAt: new Date(row.created_at * 1000)
    };
  }

  async getJobDescriptionsByUser(userId: string): Promise<JobDescription[]> {
    const rows = this.db.prepare("SELECT * FROM job_descriptions WHERE user_id = ? ORDER BY created_at DESC").all(userId) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      company: row.company,
      sourceName: row.source_name,
      rawText: row.raw_text,  // Map from snake_case to camelCase
      parsed: JSON.parse(row.parsed),
      embedding: row.embedding ? JSON.parse(row.embedding) : null,
      createdAt: new Date(row.created_at * 1000)
    }));
  }

  async createJobDescription(jd: InsertJobDescription): Promise<JobDescription> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare("INSERT INTO job_descriptions (id, user_id, title, company, source_name, raw_text, parsed, embedding, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, jd.userId, jd.title, jd.company, jd.sourceName, jd.rawText, JSON.stringify(jd.parsed), jd.embedding ? JSON.stringify(jd.embedding) : null, now);
    return { id, ...jd, createdAt: new Date(now * 1000) };
  }

  async deleteJobDescription(id: string): Promise<void> {
    this.db.prepare("DELETE FROM job_descriptions WHERE id = ?").run(id);
  }

  async getCoverLetter(id: string): Promise<CoverLetter | undefined> {
    const row = this.db.prepare("SELECT * FROM cover_letters WHERE id = ?").get(id) as any;
    if (!row) return undefined;
    return { 
      id: row.id,
      userId: row.user_id,
      resumeId: row.resume_id,
      jdId: row.jd_id,
      tone: row.tone,
      contentMd: row.content_md,
      content: row.content_md, // Map contentMd to content for frontend compatibility
      version: row.version,
      createdAt: new Date(row.created_at * 1000) 
    };
  }

  async getCoverLettersByUser(userId: string): Promise<CoverLetter[]> {
    const rows = this.db.prepare("SELECT * FROM cover_letters WHERE user_id = ? ORDER BY created_at DESC").all(userId) as any[];
    return rows.map(row => ({ 
      id: row.id,
      userId: row.user_id,
      resumeId: row.resume_id,
      jdId: row.jd_id,
      tone: row.tone,
      contentMd: row.content_md,
      content: row.content_md, // Map contentMd to content for frontend compatibility
      version: row.version,
      createdAt: new Date(row.created_at * 1000) 
    }));
  }

  async createCoverLetter(letter: InsertCoverLetter): Promise<CoverLetter> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare("INSERT INTO cover_letters (id, user_id, resume_id, jd_id, tone, content_md, version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, letter.userId, letter.resumeId, letter.jdId, letter.tone, letter.contentMd, letter.version, now);
    return { id, ...letter, content: letter.contentMd, createdAt: new Date(now * 1000) };
  }

  async updateCoverLetter(id: string, updates: Partial<InsertCoverLetter & { content?: string; lastImproved?: string }>): Promise<CoverLetter> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) {
      updateFields.push("content_md = ?");
      values.push(updates.content);
    }
    if (updates.contentMd !== undefined) {
      updateFields.push("content_md = ?");
      values.push(updates.contentMd);
    }
    if (updates.tone !== undefined) {
      updateFields.push("tone = ?");
      values.push(updates.tone);
    }

    if (updateFields.length === 0) {
      return this.getCoverLetter(id) as Promise<CoverLetter>;
    }

    values.push(id);
    this.db.prepare(`UPDATE cover_letters SET ${updateFields.join(", ")} WHERE id = ?`).run(...values);
    return this.getCoverLetter(id) as Promise<CoverLetter>;
  }

  async deleteCoverLetter(id: string): Promise<void> {
    this.db.prepare("DELETE FROM cover_letters WHERE id = ?").run(id);
  }

  async deleteAllCoverLetters(userId: string): Promise<number> {
    const result = this.db.prepare("DELETE FROM cover_letters WHERE user_id = ?").run(userId);
    return result.changes || 0;
  }

  async getJob(id: string): Promise<Job | undefined> {
    const row = this.db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      payload: JSON.parse(row.payload),
      artifacts: row.artifacts ? JSON.parse(row.artifacts) : null,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000)
    };
  }

  async createJob(job: InsertJob): Promise<Job> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare("INSERT INTO jobs (id, type, payload, status, artifacts, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, job.type, JSON.stringify(job.payload), job.status, job.artifacts ? JSON.stringify(job.artifacts) : null, now, now);
    return { id, ...job, createdAt: new Date(now * 1000), updatedAt: new Date(now * 1000) };
  }

  async updateJobStatus(id: string, status: string, artifacts?: any): Promise<Job> {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare("UPDATE jobs SET status = ?, artifacts = ?, updated_at = ? WHERE id = ?")
      .run(status, artifacts ? JSON.stringify(artifacts) : null, now, id);
    return this.getJob(id) as Promise<Job>;
  }

  async getATSScore(resumeId: string, jdId: string): Promise<ATSScore | undefined> {
    const row = this.db.prepare("SELECT * FROM ats_scores WHERE resume_id = ? AND jd_id = ?").get(resumeId, jdId) as any;
    if (!row) return undefined;
    return {
      ...row,
      breakdown: JSON.parse(row.breakdown),
      suggestions: JSON.parse(row.suggestions),
      updatedAt: new Date(row.updated_at * 1000)
    };
  }

  async saveATSScore(score: Omit<ATSScore, "id">): Promise<ATSScore> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare("INSERT OR REPLACE INTO ats_scores (id, resume_id, jd_id, overall, breakdown, suggestions, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, score.resumeId, score.jdId, score.overall, JSON.stringify(score.breakdown), JSON.stringify(score.suggestions), now);
    return { id, ...score, updatedAt: new Date(now * 1000) };
  }
}

export const storage = new SQLiteStorage();
