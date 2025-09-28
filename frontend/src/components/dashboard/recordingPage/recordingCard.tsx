import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Play } from "lucide-react";

const RecordingCard = () => {
  return (
    <div className="flex items-center pl-2 mt-2">
      <Card className="flex flex-row justify-between gap-0 lg:w-[28%] md:w-[55%] w-[90%] py-0 rounded-sm">
        <CardHeader className="w-1/6 px-0 flex items-center justify-center">
          <Play className="h-8 w-8" />
        </CardHeader>
        <CardContent className="w-4/6 px-0 flex justify-start">
          <div className=" flex flex-col justify-center">
            <CardTitle>Recording</CardTitle>
            <CardDescription>Recorded on 21/09/2025</CardDescription>
          </div>
        </CardContent>
        <CardFooter className="px-0 h-full rounded-br-md rounded-tr-md py-0 w-1/6">
          <div
            className="w-14 h-14 rounded-br-sm rounded-tr-sm"
            style={{
              backgroundImage:
                'url("https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80")',
              backgroundSize: "cover",
            }}
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default RecordingCard;
