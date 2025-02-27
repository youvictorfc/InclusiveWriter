import { useQuery } from '@tanstack/react-query';
import { type Document } from '@shared/schema';
import { Link } from 'wouter';

export default function DocumentViewer({ params }: { params: { id: string } }) {
  const documentId = parseInt(params.id);

  const { data: document, isLoading, error } = useQuery<Document>({
    queryKey: ['/api/documents', documentId],
    enabled: !!documentId,
    retry: false,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error || !document) return <div>Error loading document</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4">
        <Link href="/documents" className="text-primary hover:underline">
          ← Back to Documents
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">{document.title}</h1>
      <div className="prose max-w-none" 
           dangerouslySetInnerHTML={{ __html: document.htmlContent }} />
    </div>
  );
}