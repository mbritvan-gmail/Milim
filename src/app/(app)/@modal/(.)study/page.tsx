import { Overlay } from "@/components/overlay";
import StudyPage from "../../study/page";

// Working out a verb's forms the first time can take a little while.
export const maxDuration = 60;

// A study session opens full screen over the page you were on (the Flash Cards page, a song, a Pack); its X returns there.
export default function StudyOverlay(props: Parameters<typeof StudyPage>[0]) {
  return (
    <Overlay>
      <StudyPage {...props} />
    </Overlay>
  );
}
