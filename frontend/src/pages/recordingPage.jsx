import React from "react";
import Header from "../components/dashboard/header";
import { authClient } from "../lib/auth-client";
import RecordingPageBody from "../components/dashboard/recordingPage/recordingPageBody";

const RecordingPage = () => {
  const { data: session, isPending } = authClient.useSession();

  return (
    <div className="w-full">
      <div className="md:w-[80%] w-full mx-auto">
        {isPending ? (
          <Header session={null} isPending={true} />
        ) : session && session.user ? (
          <Header session={session.user} isPending={isPending} />
        ) : (
          <Header session={null} isPending={isPending} />
        )}
      </div>
      <div className="md:w-[70%] w-[90%] mx-auto mt-4">
        {/* <DashboardBody /> */}
        <RecordingPageBody />
      </div>
    </div>
  );
  I;
};

export default RecordingPage;
