import { useQuery } from '@tanstack/react-query';
import { type Document } from '@shared/schema';

export default function DocumentViewer({ params }: { params: { id: string } }) {
  const documentId = parseInt(params.id);
  console.log('DocumentViewer params:', params);

  const { data: document, isLoading, error } = useQuery<Document>({
    queryKey: ['/api/documents', documentId],
    enabled: !!documentId && !isNaN(documentId)
  });

  console.log('Document data:', document);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!document) {
    return <div>No document found</div>;
  }

  return (
    <div>
      <h1>{document.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: document.htmlContent }} />
    </div>
  );
}