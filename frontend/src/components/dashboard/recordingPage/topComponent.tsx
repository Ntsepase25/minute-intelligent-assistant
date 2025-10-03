import React from "react";
import { Button } from "../../ui/button";
import { RefreshCcw, Trash2 } from "lucide-react";
import { recording } from "../../../lib/types";

type Props = {
  recording: recording;
  loading: boolean;
};
const TopComponent = ({ recording, loading }: Props) => {
  return (
    <div className="flex md:flex-row flex-col gap-2 justify-between mx-2">
      <div className="flex flex-col">
        <div className="font-bold text-xl">
          Meeting ID:{" "}
          {!loading && recording && (
            <span className=" font-normal">
              {recording.meetingId}
            </span>
          )}
        </div>
        {!loading && recording && (
          <div className="text-muted-foreground text-sm">
            {recording.meetingPlatform}
          </div>
        )}
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
