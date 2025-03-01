import { type Analysis, type InsertAnalysis, type Document, type InsertDocument } from "@shared/schema";
import { supabaseAdmin } from "./lib/supabase";

export interface IStorage {
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  createDocument(document: InsertDocument & { userId: string }): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getUserDocuments(userId: string): Promise<Document[]>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
}

export class SupabaseStorage implements IStorage {
  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const { data, error } = await supabaseAdmin
      .from('analyses')
      .insert(insertAnalysis)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const { data, error } = await supabaseAdmin
      .from('analyses')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // not found
      throw error;
    }
    return data;
  }

  async createDocument(document: InsertDocument & { userId: string }): Promise<Document> {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        ...document,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // not found
      throw error;
    }
    return data;
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select()
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({
        ...document,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteDocument(id: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const storage = new SupabaseStorage();