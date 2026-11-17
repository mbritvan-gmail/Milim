import { Overlay } from "@/components/overlay";
import StudyPage from "../../flashcards/page";

// Working out a verb's forms the first time can take a little while.
export const maxDuration = 60;

export default function StudyOverlay(props: Parameters<typeof StudyPage>[0]) {
  return (
    <Overlay>
      <StudyPage {...props} />
    </Overlay>
  );
}
