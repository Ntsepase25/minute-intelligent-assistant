import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, Copy, Download, Search, ChevronDown, ChevronUp, Users, Clock } from "lucide-react";
import { toast } from "sonner";
import { TranscriptEntry, Participant } from "@/lib/types";
import GoogleMeetNotAvailable from "./GoogleMeetNotAvailable";

interface TranscriptWithSpeakersProps {
  transcriptEntries: TranscriptEntry[] | null;
  participants: Participant[] | null;
  meetingId?: string;
  googleMeetError?: boolean;
}

export default function TranscriptWithSpeakers({ 
  transcriptEntries, 
  participants,
  meetingId,
  googleMeetError 
}: TranscriptWithSpeakersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);

  // Create speaker map for quick lookup
  const speakerMap = useMemo(() => {
    if (!participants) return new Map();
    
    const map = new Map<string, Participant>();
    participants.forEach(participant => {
      map.set(participant.googleParticipantId, participant);
    });
    return map;
  }, [participants]);

  // Get unique speakers for filter
  const speakers = useMemo(() => {
    if (!transcriptEntries || !participants) return [];
    
    const uniqueSpeakers = new Set<string>();
    transcriptEntries.forEach(entry => {
      if (entry.googleParticipantId) {
        uniqueSpeakers.add(entry.googleParticipantId);
      }
    });
    
    return Array.from(uniqueSpeakers)
      .map(speakerId => speakerMap.get(speakerId))
      .filter(Boolean);
  }, [transcriptEntries, speakerMap]);

  // Filter entries based on search and speaker selection
  const filteredEntries = useMemo(() => {
    if (!transcriptEntries) return [];
    
    let filtered = transcriptEntries;
    
    // Filter by selected speaker
    if (selectedSpeaker) {
      filtered = filtered.filter(entry => entry.googleParticipantId === selectedSpeaker);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.text.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [transcriptEntries, selectedSpeaker, searchTerm]);

  const previewLength = 5; // Number of entries to show in preview
  const isLongTranscript = filteredEntries.length > previewLength;
  const displayEntries = (!isLongTranscript || isExpanded) 
    ? filteredEntries 
    : filteredEntries.slice(0, previewLength);

  const getSpeakerInfo = (googleParticipantId: string | null) => {
    if (!googleParticipantId) return null;
    return speakerMap.get(googleParticipantId);
  };

  const getSpeakerInitials = (speaker: Participant | null) => {
    if (!speaker?.displayName) return "?";
    return speaker.displayName
      .split(" ")
      .map(name => name.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  const getSpeakerColor = (speakerId: string) => {
    // Generate consistent color based on speaker ID
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", 
      "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-red-500"
    ];
    const hash = speakerId.split("").reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const formatTime = (time: Date) => {
    return new Date(time).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const copyToClipboard = async () => {
    const fullTranscript = filteredEntries
      .map(entry => {
        const speaker = getSpeakerInfo(entry.googleParticipantId);
        const speakerName = speaker?.displayName || "Unknown Speaker";
        const timestamp = formatTime(entry.startTime);
        return `[${timestamp}] ${speakerName}: ${entry.text}`;
      })
      .join("\\n\\n");
    
    try {
      await navigator.clipboard.writeText(fullTranscript);
      toast.success("Transcript copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy transcript");
    }
  };

  const downloadTranscript = () => {
    const fullTranscript = filteredEntries
      .map(entry => {
        const speaker = getSpeakerInfo(entry.googleParticipantId);
        const speakerName = speaker?.displayName || "Unknown Speaker";
        const timestamp = formatTime(entry.startTime);
        return `[${timestamp}] ${speakerName}: ${entry.text}`;
      })
      .join("\\n\\n");
    
    const blob = new Blob([fullTranscript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting-transcript-with-speakers.txt";
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

  // Handle case where we have participants but no transcript entries
  if (!transcriptEntries || transcriptEntries.length === 0) {
    // If this is a Google Meet error case, show the helpful component
    if (googleMeetError && meetingId) {
      return <GoogleMeetNotAvailable meetingId={meetingId} />;
    }
    
    if (participants && participants.length > 0) {
      return (
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Meeting Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {participants.length} Participant{participants.length !== 1 ? 's' : ''} Found
                  </span>
                </div>
                <p className="text-xs text-blue-700">
                  Transcript with speaker attribution is not available (transcription may not have been enabled), 
                  but we found the meeting participants and their join/leave times.
                </p>
              </div>
              
              <div className="space-y-3">
                {participants.map((participant, index) => {
                  const speakerColor = `hsl(${(index * 137.508) % 360}, 70%, 50%)`;
                  const initials = participant.displayName
                    .split(' ')
                    .map(name => name[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div key={participant.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Avatar className="h-8 w-8" style={{ backgroundColor: speakerColor }}>
                        <AvatarFallback style={{ backgroundColor: speakerColor, color: 'white' }}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{participant.displayName}</span>
                          <Badge variant="outline" className="text-xs">
                            {participant.participantType === 'signedinUser' ? 'Signed In' : 
                             participant.participantType === 'anonymousUser' ? 'Anonymous' : 'Phone'}
                          </Badge>
                        </div>
                        
                        {(participant.earliestStartTime || participant.latestEndTime) && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {participant.earliestStartTime && (
                              <span>Joined: {new Date(participant.earliestStartTime).toLocaleTimeString()}</span>
                            )}
                            {participant.earliestStartTime && participant.latestEndTime && <span> • </span>}
                            {participant.latestEndTime && (
                              <span>Left: {new Date(participant.latestEndTime).toLocaleTimeString()}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Meeting Transcript with Speakers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No transcript with speaker attribution available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-primary" />
            Meeting Transcript with Speakers
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
              {speakers.length} speakers
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
              {transcriptEntries.length} segments
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-3 py-2 text-xs border border-input rounded-md bg-background"
            />
          </div>
          
          {/* Speaker filter and actions */}
          <div className="flex items-center gap-2">
            <select
              value={selectedSpeaker || ""}
              onChange={(e) => setSelectedSpeaker(e.target.value || null)}
              className="flex-1 text-xs border border-input rounded-md bg-background px-2 py-2"
            >
              <option value="">All speakers</option>
              {speakers.map((speaker) => (
                <option key={speaker.googleParticipantId} value={speaker.googleParticipantId}>
                  {speaker.displayName || "Unknown Speaker"}
                </option>
              ))}
            </select>
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
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-4">
          {displayEntries.map((entry) => {
            const speaker = getSpeakerInfo(entry.googleParticipantId);
            const speakerColor = entry.googleParticipantId 
              ? getSpeakerColor(entry.googleParticipantId)
              : "bg-gray-500";
            
            return (
              <div key={entry.id} className="flex gap-3 group">
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={`${speakerColor} text-white text-xs`}>
                      {getSpeakerInitials(speaker)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge variant="outline" className="text-xs px-1 py-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Clock className="h-2 w-2 mr-1" />
                    {formatTime(entry.startTime)}
                  </Badge>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {speaker?.displayName || "Unknown Speaker"}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className="text-xs capitalize"
                    >
                      {speaker?.participantType || "unknown"}
                    </Badge>
                  </div>
                  <div 
                    className="text-sm text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightSearchTerm(entry.text) 
                    }}
                  />
                </div>
              </div>
            );
          })}
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
                Show More ({filteredEntries.length - previewLength} more segments)
              </>
            )}
          </Button>
        )}
        
        {filteredEntries.length === 0 && (searchTerm || selectedSpeaker) && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No matching transcript segments found</p>
            <p className="text-xs mt-1">Try adjusting your search or speaker filter</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
