import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Calendar } from "lucide-react";

interface MeetingSummaryProps {
  title: string | null;
  minutes: string | null;
  summary: string | null;
  createdAt: Date;
}

export default function MeetingSummary({ title, minutes, summary, createdAt }: MeetingSummaryProps) {
  const displaySummary = minutes || summary || "No summary available yet.";
  const displayTitle = title || "Meeting Recording";

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" />
            Meeting Summary
          </CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Generated
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold text-lg mb-2">{displayTitle}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Calendar className="h-3 w-3" />
            {formatDate(createdAt)}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-sm mb-2">Key Discussion Points</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {displaySummary}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
