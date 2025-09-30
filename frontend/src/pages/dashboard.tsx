import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import Header from "../components/dashboard/header";
import DashboardBody from "../components/dashboard/dashboardBody";
import type { recording } from "../lib/types";

import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircleIcon, CloudUpload, Funnel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const DashBoard = () => {
  const { data: session, isPending } = authClient.useSession();
  const [recordings, setRecordings] = useState<recording[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = async () => {
    const response = await fetch(
      // @ts-ignore
      `${import.meta.env.VITE_BACKEND_BASE_URL}/recordings`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // This is crucial for sending cookies
      }
    );
    const data = await response.json();
    console.log("recordings: ", data);
    setRecordings(data.recordings);
    setLoading(false);
  };

  useEffect(() => {
    console.log("Session data:", session);
    if (!isPending && session) {
      fetchRecordings();
    }
    if (!session && !loading) {
      setLoading(false);
    }
  }, [session]);

  // console.log("recordings in useState: ", recordings)

  return (
    <div className="w-full">
      <div className="md:w-[80%] w-full mx-auto">
        {isPending ? (
          <Header session={undefined} isPending={true} />
        ) : session && session.user ? (
          <Header session={session.user} isPending={isPending} />
        ) : (
          <Header session={undefined} isPending={isPending} />
        )}
      </div>
      <div className="md:w-[70%] w-[90%] mx-auto mt-4">
        {loading && (
          <div className="flex justify-center items-center mt-5">
            <Loader2 className="animate-spin text-purple-500 h-5 w-5" />
          </div>
        )}
        {recordings && recordings.length > 0 ? (
          <DashboardBody recordings={recordings} />
        ) : (
          !loading && (
            <div className="w-full flex flex-col">
              <div className="mb-4 flex lg:flex-row flex-col gap-4 justify-between mx-2">
                <div className="flex flex-col">
                  <div className="text-2xl font-bold">MIA Dashboard</div>
                  <div className="text-muted-foreground text-sm">
                    Manage your minutes and recordings
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Button variant="outline">
                    <CloudUpload className="h-4 w-4" />
                    Upload Recording
                  </Button>
                  <Button variant="outline">
                    <Funnel className="h-4 w-4" />
                    Filter by Date
                  </Button>
                </div>
              </div>
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>No recordings found.</AlertTitle>
                <AlertDescription>
                  <p>Please upload a recording.</p>
                </AlertDescription>
              </Alert>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default DashBoard;
