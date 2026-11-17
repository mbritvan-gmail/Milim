import { Overlay } from "@/components/overlay";
import ModulePage from "../../../vocabulary/[id]/page";

// Looking up new words with the AI can take a little while.
export const maxDuration = 60;

export default function ModuleOverlay(props: Parameters<typeof ModulePage>[0]) {
  return (
    <Overlay bar={false}>
      <ModulePage {...props} />
    </Overlay>
  );
}
