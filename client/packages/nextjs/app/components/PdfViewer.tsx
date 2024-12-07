export default function PdfViewer({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="w-full h-screen p-8">
      <object
        data={`${url}#toolbar=1&navpanes=1&view=FitH`}
        type="application/pdf"
        className="w-full h-full rounded-lg shadow-lg"
      >
        <p>
          PDF cannot be displayed in your browser.{" "}
          <a href={url} className="text-blue-500 hover:underline">
            Download {fileName}
          </a>
        </p>
      </object>
    </div>
  );
}
