import { Overlay } from "@/components/overlay";
import RequestSongPage from "../../../songs/request/page";

// Same reason as "/songs/new": "request" must not be read as a song id.
export default function RequestSongOverlay() {
  return (
    <Overlay>
      <RequestSongPage />
    </Overlay>
  );
}
