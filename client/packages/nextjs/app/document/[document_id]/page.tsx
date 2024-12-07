import { Editor } from "./Editor";
import { Room } from "./Room";

export default function Page({ params }: { params: { document_id: string } }) {
  console.log(params);
  return (
    <Room document_id={params.document_id}>
      <Editor  />
    </Room>
  );
}
