import React, { useEffect, useState } from "react";
import Header from "../components/dashboard/header";
import { authClient } from "../lib/auth-client";
import RecordingPageBody from "../components/dashboard/recordingPage/recordingPageBody";
import { recording } from "../lib/types";
import { useParams } from "react-router-dom";

const RecordingPage = () => {
  const { data: session, isPending } = authClient.useSession();
  const [recording, setRecording] = useState<recording | null>(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();

  const fetchRecording = async () => {
    const response = await fetch(
      // @ts-ignore
      `${import.meta.env.VITE_BACKEND_BASE_URL}/recordings/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // This is crucial for sending cookies
      }
    );
    const data = await response.json();
    console.log("recording: ", data);
    setRecording(data.recording);
    setLoading(false);
  };

  useEffect(() => {
    console.log("Session data:", session);
    if (!isPending && session) {
      fetchRecording();
    }
  }, [session]);

  if (!session && !loading) {
    setLoading(false);
  }

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
        <RecordingPageBody recording={recording} loading={loading} />
      </div>
    </div>
  );
  I;
};

export default RecordingPage;
