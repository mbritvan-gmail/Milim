import { Overlay } from "@/components/overlay";
import NewSongPage from "../../../songs/new/page";

// Translating a full song can take a while.
export const maxDuration = 60;

// "/songs/new" has its own entry so the pop-up route for a song ("/songs/[id]") doesn't catch "new" as if
// it were a song id. The form opens as a pop-up too.
export default function NewSongOverlay(props: Parameters<typeof NewSongPage>[0]) {
  return (
    <Overlay nav>
      <NewSongPage {...props} />
    </Overlay>
  );
}
