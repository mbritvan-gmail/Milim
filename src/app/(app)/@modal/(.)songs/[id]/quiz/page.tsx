import { Overlay } from "@/components/overlay";
import QuizPage from "../../../../songs/[id]/quiz/page";

export const maxDuration = 60;

export default function QuizOverlay(props: Parameters<typeof QuizPage>[0]) {
  return (
    <Overlay>
      <QuizPage {...props} />
    </Overlay>
  );
}
