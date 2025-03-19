import { type Analysis, type InsertAnalysis, type User, type InsertUser, analyses, users } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { type Document, type InsertDocument, documents } from "@shared/schema"; 

export interface IStorage {
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  createUser(user: InsertUser & {
    passwordHash: string;
    verificationToken: string;
    verificationExpires: Date;
    isVerified: boolean;
  }): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  verifyUser(userId: number): Promise<User>;
  createDocument(document: InsertDocument & { userId: number }): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getUserDocuments(userId: number): Promise<Document[]>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  updateUserPassword(userId: number, newPasswordHash: string): Promise<User>;
  deleteDocument(id: number): Promise<void>;
  deleteUser(id: number): Promise<void>; // Added deleteUser function
}

export class DatabaseStorage implements IStorage {
  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db.insert(analyses).values(insertAnalysis).returning();
    return analysis;
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser & {
    passwordHash: string;
    verificationToken: string;
    verificationExpires: Date;
    isVerified: boolean;
  }): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user;
  }

  async verifyUser(userId: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isVerified: true,
        verificationToken: null,
        verificationExpires: null
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createDocument(document: InsertDocument & { userId: number }): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getUserDocuments(userId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.updatedAt));
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set({
        ...document,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async updateUserPassword(userId: number, newPasswordHash: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  async deleteDocument(id: number): Promise<void> {
    await db
      .delete(documents)
      .where(eq(documents.id, id));
  }
  async deleteUser(id: number): Promise<void> {
    await db
      .delete(users)
      .where(eq(users.id, id));
  }
}

export const storage = new DatabaseStorage();