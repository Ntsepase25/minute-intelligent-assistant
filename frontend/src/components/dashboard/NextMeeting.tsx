import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, StickyNote } from "lucide-react";
import { NextMeeting as NextMeetingType } from "@/lib/types";

interface NextMeetingProps {
  nextMeeting: NextMeetingType | null;
}

export default function NextMeeting({ nextMeeting }: NextMeetingProps) {
  if (!nextMeeting || (!nextMeeting.date && !nextMeeting.location && !nextMeeting.notes)) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" />
            Next Meeting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No next meeting scheduled.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      // Try to parse various date formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // If not a valid date, return the original string
        return dateString;
      }
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" />
          Next Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nextMeeting.date && (
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Date & Time</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(nextMeeting.date)}
              </p>
            </div>
          </div>
        )}
        
        {nextMeeting.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Location</p>
              <p className="text-sm text-muted-foreground">
                {nextMeeting.location}
              </p>
            </div>
          </div>
        )}
        
        {nextMeeting.notes && (
          <div className="flex items-start gap-3">
            <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Notes</p>
              <p className="text-sm text-muted-foreground">
                {nextMeeting.notes}
              </p>
            </div>
          </div>
        )}
        
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
          <CalendarDays className="h-3 w-3 mr-1" />
          Upcoming
        </Badge>
      </CardContent>
    </Card>
  );
}
