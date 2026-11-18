import { Overlay } from "@/components/overlay";
import SettingsPage from "../../settings/page";

// The temporary nikud tool adds nikud to one song per request, which can take up to a minute.
export const maxDuration = 60;

export default function SettingsOverlay() {
  return (
    <Overlay nav>
      <SettingsPage />
    </Overlay>
  );
}
