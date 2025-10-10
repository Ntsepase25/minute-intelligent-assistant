import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, VideoIcon, Users, MessageSquare } from "lucide-react";

interface GoogleMeetNotAvailableProps {
  meetingId: string;
  reason?: string;
}

export default function GoogleMeetNotAvailable({ 
  meetingId, 
  reason = "transcription not enabled" 
}: GoogleMeetNotAvailableProps) {
  return (
    <Card className="h-full border-orange-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <VideoIcon className="h-4 w-4" />
          Google Meet Data Not Available
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-50">
          <InfoIcon className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Meeting Code:</strong> {meetingId}
            <br />
            <strong>Reason:</strong> {reason}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                To Get Participant Names & Speech Data
              </span>
            </div>
            <p className="text-xs text-blue-700 mb-2">
              Enable transcription when starting your Google Meet sessions:
            </p>
            <div className="space-y-1 text-xs text-blue-700">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">1</Badge>
                Start or join your Google Meet
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">2</Badge>
                Click the "Activities" button (bottom toolbar)
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">3</Badge>
                Select "Transcription" and turn it on
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">4</Badge>
                All participants will be notified that transcription is active
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-3 w-3 text-gray-600" />
              <span className="text-xs font-medium text-gray-700">
                What You'll Get With Transcription
              </span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Participant names and join/leave times</li>
              <li>• Who spoke what words and when</li>
              <li>• Color-coded speaker attribution in transcripts</li>
              <li>• Export capabilities with speaker identification</li>
            </ul>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-muted-foreground">
            💡 This recording's transcript was generated separately, so speaker attribution 
            isn't available from Google Meet data.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
