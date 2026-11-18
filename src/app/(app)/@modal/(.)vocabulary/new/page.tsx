import { Overlay } from "@/components/overlay";
import NewModulePage from "../../../vocabulary/new/page";

// Looking up a long list of words can take a while.
export const maxDuration = 60;

// "/vocabulary/new" has its own entry here so the pop-up route for a module ("/vocabulary/[id]")
// doesn't catch "new" as if it were a module id. The form opens as a pop-up too.
export default function NewModuleOverlay() {
  return (
    <Overlay nav>
      <NewModulePage />
    </Overlay>
  );
}
