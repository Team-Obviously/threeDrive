export default function Page({ params }: { params: { document_id: string } }) {
  console.log(params);
  return (
    <div>
      <h1>Document {params.document_id}</h1>
    </div>
  );
}
