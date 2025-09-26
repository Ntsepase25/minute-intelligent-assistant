import React from "react";
import { Button } from "../ui/button";
import { CloudUpload, Funnel } from "lucide-react";
import DashboardBodyCard from "./dashboardBodyCard";


type Props = {};

const DashboardBody = (props: Props) => {
  return (
    <div className="w-full flex flex-col">
      <div className="flex lg:flex-row flex-col gap-4 justify-between mx-2">
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
      <div className="flex gap-2 items-center mt-5 ">
        <div className="flex flex-col p-4 w-full gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <DashboardBodyCard key={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardBody;
