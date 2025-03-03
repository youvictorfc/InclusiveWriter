import { type Analysis, type InsertAnalysis, type User, type InsertUser, type Document, type InsertDocument } from "@shared/schema";
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
}

// Create Supabase admin client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export interface IStorage {
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createDocument(document: InsertDocument & { userId: number }): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getUserDocuments(userId: number): Promise<Document[]>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
}

export class SupabaseStorage implements IStorage {
  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const { data, error } = await supabase
      .from('analyses')
      .insert(analysis)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const { data, error } = await supabase
      .from('analyses')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data;
  }

  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data;
  }

  async createDocument(document: InsertDocument & { userId: number }): Promise<Document> {
    const { data: userData } = await supabase
      .from('users')
      .select('supabase_id')
      .eq('id', document.userId)
      .single();

    if (!userData) {
      throw new Error('User not found');
    }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...document,
        user_id: document.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        user:users (
          id,
          email,
          supabase_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data;
  }

  async getUserDocuments(userId: number): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        user:users (
          id,
          email,
          supabase_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update({
        ...document,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteDocument(id: number): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const storage = new SupabaseStorage();