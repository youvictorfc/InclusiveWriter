import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';
import { type Document } from '@shared/schema';
import { Button } from '@/components/ui/button';

export default function Documents() {
  const { data: documents, isLoading, error } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Documents</h1>
          <Link href="/">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Document
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="p-8 text-center text-red-500">
            Error loading documents. Please try again.
          </Card>
        ) : documents?.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No documents yet. Create one from the editor.
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents?.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">{doc.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Last updated: {new Date(doc.updatedAt).toLocaleString()}</span>
                    <span>Created: {new Date(doc.createdAt).toLocaleString()}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}