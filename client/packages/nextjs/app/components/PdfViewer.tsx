import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PdfViewer({ url, fileName }: { url: string; fileName: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [pdfData, setPdfData] = useState<string | null>(null);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const dataUrl = URL.createObjectURL(blob);
        setPdfData(dataUrl);
      } catch (error) {
        console.error("Failed to fetch PDF:", error);
      }
    };

    fetchPdf();
    return () => {
      if (pdfData) {
        URL.revokeObjectURL(pdfData);
      }
    };
  }, [url]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  if (!pdfData) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading PDF...</span>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-8 bg-gray-100">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <Document
          file={pdfData}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading PDF...</span>
            </div>
          }
          error={
            <div className="text-center p-4">
              <p className="text-red-500 mb-2">Failed to load PDF</p>
              <a href={url} className="text-blue-500 hover:underline">
                Download {fileName}
              </a>
            </div>
          }
        >
          {Array.from(new Array(numPages), (el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              className="mb-4"
              renderTextLayer={true}
              renderAnnotationLayer={true}
              width={Math.min(window.innerWidth - 100, 1000)}
            />
          ))}
        </Document>
      </div>
    </div>
  );
}
