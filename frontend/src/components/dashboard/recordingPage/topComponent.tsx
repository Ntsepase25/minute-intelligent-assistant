import { RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recording } from "@/lib/types";
import { useSelectedRecordingStore } from "@/stores/recordingsStore";
import AudioPlayer from "./audioPlayer";

type Props = {
  loading: boolean;
};
const TopComponent = ({ loading }: Props) => {
  const recording = useSelectedRecordingStore(
    (state) => state.selectedRecording
  );

  return (
    <div className="flex lg:flex-row flex-col gap-2 justify-between mx-2">
      <div>
        <AudioPlayer audioUrl={recording?.recordingUrl} />
      </div>
      <div className="flex gap-2 items-center">
        <Button variant="outline">
          <RefreshCcw className="h-4 w-4 " />
          Regenerate
        </Button>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 " />
          Delete
        </Button>
      </div>
    </div>
  );
};

export default TopComponent;
