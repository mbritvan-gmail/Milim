import { Overlay } from "@/components/overlay";
import GroupPage from "../../../alef-bet/[group]/page";

// The letter cards open full screen over the Alef-bet start screen, like the flash cards do.
export default function GroupOverlay(props: Parameters<typeof GroupPage>[0]) {
  return (
    <Overlay bar={false}>
      <GroupPage {...props} />
    </Overlay>
  );
}
