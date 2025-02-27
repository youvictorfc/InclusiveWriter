import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { type Document } from '@shared/schema';

export default function Documents() {
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <span>Documents</span>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : documents?.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No documents yet. Create one from the editor.
            </Card>
          ) : (
            documents?.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <a className="block">
                  <Card className="p-4 hover:bg-accent cursor-pointer">
                    <h3 className="font-medium">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Last updated: {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </Card>
                </a>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}