import React from "react";
import TopComponent from "./topComponent";
import RecordingCard from "./recordingCard";
import RecodingPageContent from "./recordingPageContent";

type Props = {};

const RecordingPageBody = (props: Props) => {
  return (
    <div className="w-full flex flex-col gap-2">
      <TopComponent />
      <RecordingCard />
      <RecodingPageContent />
    </div>
  );
};

export default RecordingPageBody;
