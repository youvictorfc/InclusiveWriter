import { supabase } from './supabase';
import type { Document, Analysis, AnalysisResult } from '@shared/schema';

export const db = {
  // Document operations
  async getDocuments() {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        user:users (
          id,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as (Document & { user: { id: number; email: string } })[];
  },

  async getDocument(id: number) {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        user:users (
          id,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Document & { user: { id: number; email: string } };
  },

  async createDocument(document: Omit<Document, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_id', user.id)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error('User not found');

    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...document,
        user_id: userData.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Document;
  },

  async updateDocument(id: number, document: Partial<Document>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('documents')
      .update(document)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Document;
  },

  async deleteDocument(id: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Analysis operations
  async createAnalysis(analysis: Omit<Analysis, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('analyses')
      .insert(analysis)
      .select()
      .single();

    if (error) throw error;
    return data as Analysis;
  },

  async updateAnalysisResult(documentId: number, result: AnalysisResult) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('documents')
      .update({
        analysis_result: result,
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data as Document;
  },
};