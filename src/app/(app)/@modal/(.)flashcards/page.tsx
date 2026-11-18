import { Suspense } from "react";
import { Overlay } from "@/components/overlay";
import StudyPage from "../../flashcards/page";

// Working out a verb's forms the first time can take a little while.
export const maxDuration = 60;

type Props = Parameters<typeof StudyPage>[0];

// A study session covers the whole screen, bottom bar included. The Flash Cards start screen (nothing chosen
// yet) keeps the bottom bar, like the other pages.
async function Pop({ searchParams }: Props) {
  const { filter, song, module: moduleId } = await searchParams;
  const isStart = !filter && !song && !moduleId;
  return (
    <Overlay nav={isStart}>
      <StudyPage searchParams={searchParams} />
    </Overlay>
  );
}

export default function StudyOverlay(props: Props) {
  return (
    <Suspense
      fallback={
        <Overlay nav>
          <p className="py-8 text-center text-muted">Loading…</p>
        </Overlay>
      }
    >
      <Pop {...props} />
    </Suspense>
  );
}
