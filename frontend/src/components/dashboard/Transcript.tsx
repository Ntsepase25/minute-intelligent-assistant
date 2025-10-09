import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Copy, Download, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface TranscriptProps {
  transcript: string | null;
}

export default function Transcript({ transcript }: TranscriptProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const displayTranscript = transcript || "Transcript not available yet.";
  const words = displayTranscript.split(" ");
  const previewLength = 50; // Number of words to show in preview
  const isLongTranscript = words.length > previewLength;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(displayTranscript);
      toast.success("Transcript copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy transcript");
    }
  };

  const downloadTranscript = () => {
    const blob = new Blob([displayTranscript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting-transcript.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Transcript downloaded");
  };

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.trim()})`, "gi");
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  const getDisplayText = () => {
    if (!isLongTranscript || isExpanded) {
      return displayTranscript;
    }
    return words.slice(0, previewLength).join(" ") + "...";
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" />
            Meeting Transcript
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
              {words.length} words
            </Badge>
          </div>
        </div>
        
        {transcript && (
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search transcript..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-xs border border-input rounded-md bg-background"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="text-xs"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTranscript}
              className="text-xs"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="prose prose-sm max-w-none">
          <div 
            className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ 
              __html: highlightSearchTerm(getDisplayText()) 
            }}
          />
        </div>
        
        {isLongTranscript && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show More ({words.length - previewLength} more words)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
