import { Overlay } from "@/components/overlay";
import SongPage from "../../../songs/[id]/page";

// Preparing quiz answers and looking up words with the AI can take a little while.
export const maxDuration = 60;

// A song opens over the page you were on. Its X sits beside Edit, so the top bar is left out.
export default function SongOverlay(props: Parameters<typeof SongPage>[0]) {
  return (
    <Overlay bar={false}>
      <SongPage {...props} />
    </Overlay>
  );
}
