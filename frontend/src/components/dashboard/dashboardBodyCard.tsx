import React from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";


const DashboardBodyCard = () => {
  return (
    <Card className="rounded-sm flex flex-row">
      <CardHeader className=" w-1/4 ml-2">
        <div
          className="w-36 h-36 rounded-md "
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80")',
            backgroundSize: "cover",
          }}
        />
      </CardHeader>
      <CardContent className="w-3/4">
        <CardTitle>MIA Progress Meeting</CardTitle>
        <CardDescription className="mt-4">
          Lorem ipsum dolor sit amet consectetur adipiscing elit. Sit amet
          consectetur adipiscing elit quisque faucibus ex. Adipiscing elit
          quisque faucibus ex sapien vitae pellentesque.
        </CardDescription>
        <Button className="bg-purple-500 hover:bg-purple-600 text-white mt-5">View Details</Button>
      </CardContent>
    </Card>
  );
};

export default DashboardBodyCard;
