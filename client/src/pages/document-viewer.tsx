import { useQuery } from '@tanstack/react-query';
import { type Document } from '@shared/schema';

export default function DocumentViewer({ params }: { params: { id: string } }) {
  const { data: document, isLoading } = useQuery<Document>({
    queryKey: ['/api/documents', parseInt(params.id)],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!document) {
    return <div>Document not found</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>{document.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: document.htmlContent }} />
    </div>
  );
}