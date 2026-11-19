import { Overlay } from "@/components/overlay";
import CardPage from "../../../alef-bet/[card]/page";

// A card opens full screen over the Alef-bet page, like the flash cards do.
export default function CardOverlay(props: Parameters<typeof CardPage>[0]) {
  return (
    <Overlay bar={false}>
      <CardPage {...props} />
    </Overlay>
  );
}
