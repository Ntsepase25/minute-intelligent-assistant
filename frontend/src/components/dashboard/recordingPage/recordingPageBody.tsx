import React from "react";
import TopComponent from "./topComponent";
import RecordingCard from "./recordingCard";
import RecodingPageContent from "./recordingPageContent";
import { recording } from "../../../lib/types";

type Props = {
  recording: recording;
  loading: boolean;
};

const RecordingPageBody = ({ recording, loading }: Props) => {
  return (
    <div className="w-full flex flex-col gap-2">
      <TopComponent recording={recording} loading={loading} />
      <RecordingCard recording={recording} loading={loading} />
      <RecodingPageContent recording={recording} loading={loading} />
    </div>
  );
};

export default RecordingPageBody;
