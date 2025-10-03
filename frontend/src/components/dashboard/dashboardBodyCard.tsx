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
import { recording } from "../../lib/types";
import { FormattedText } from "../../utils/formatText";

type Props = {
  recording: recording;
};

const DashboardBodyCard = ({ recording }: Props) => {
  return (
    <Card className="rounded-sm flex flex-row gap-0">
      <CardHeader className="w-1/6 ml-2 px-0 flex items-center justify-center">
        <div
          className="w-36 h-36 rounded-md "
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80")',
            backgroundSize: "cover",
          }}
        />
      </CardHeader>
      <CardContent className="w-5/6 px-0">
        <CardTitle className="flex justify-between">
          <div className="flex flex-col">
            <div className="font-bold text-xl">
              Meeting Platform:{" "}
              <span className="text-sm font-normal">
                {recording.meetingPlatform}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-bold"> Meeting ID: </span>
              {recording.meetingId}
            </div>
          </div>
          <span className="text-sm text-muted-foreground mr-2">
            {new Date(recording.createdAt).toUTCString()}
          </span>
        </CardTitle>
        <CardDescription className="mt-4">
          {recording.summary ? (
            <FormattedText text={recording.summary} />
          ) : (
            <div>
              Lorem ipsum dolor sit amet consectetur adipiscing elit. Sit amet
              consectetur adipiscing elit quisque faucibus ex. Adipiscing elit
              quisque faucibus ex sapien vitae pellentesque.
            </div>
          )}
        </CardDescription>
        <Button
          className="bg-purple-500 hover:bg-purple-600 text-white mt-5"
          asChild
        >
          <a href={`/dashboard/recording/${recording.id}`}>View Details</a>
        </Button>
      </CardContent>
    </Card>
  );
};

export default DashboardBodyCard;
