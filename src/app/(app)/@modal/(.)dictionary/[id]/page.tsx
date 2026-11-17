import { Overlay } from "@/components/overlay";
import WordPage from "../../../dictionary/[id]/page";

export const maxDuration = 60;

export default function WordOverlay(props: Parameters<typeof WordPage>[0]) {
  return (
    <Overlay>
      <WordPage {...props} />
    </Overlay>
  );
}
