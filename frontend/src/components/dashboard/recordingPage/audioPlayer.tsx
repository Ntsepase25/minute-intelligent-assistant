import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import { useState } from "react";
import WavesurferPlayer from "@wavesurfer/react";

type Props = {
  audioUrl: string;
};

const AudioPlayer = ({ audioUrl }: Props) => {
  const [wavesurfer, setWavesurfer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const onReady = (ws: any) => {
    setWavesurfer(ws);
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    wavesurfer && wavesurfer.playPause();
  };

  if (!audioUrl) {
    return (
      <div className="text-red-500 text-sm">
        <i>No audio available</i>
      </div>
    );
  }

  return (
    <div className="flex items-center md:pl-2 mt-2 w-full">
      <Card className="flex shadow-none bg-transparent border-none flex-row items-center justify-between gap-0 w-full py-2 rounded-md">
        <CardHeader className="w-1/6 pl-4 pr-0 flex items-center justify-end">
          <Button
            variant="unstyled"
            size="icon"
            onClick={handlePlayPause}
            className="h-12 w-12 text-purple-600"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8" />
            )}
          </Button>
        </CardHeader>
        <CardContent className="w-5/6 px-4 flex justify-start bg-none shadow-none pl-0">
          <div className="flex flex-col justify-center w-full h-[100px] pl-0">
            <div
              className="pt-3 rounded-md w-full h-[60px] min-w-52 md:min-w-72"
              style={{
                minHeight: "60px",
                height: "60px",
                width: "100%",
              }}
            >
              <div
                className="w-full h-full pl-0"
                style={{
                  width: "100%",
                  height: "60px",
                  overflow: "hidden",
                }}
              >
                <WavesurferPlayer
                  height={60}
                  waveColor="#ccc"
                  progressColor="#a855f7"
                  cursorColor="transparent"
                  barWidth={2}
                  barGap={3}
                  normalize={true}
                  interact={true}
                  url={audioUrl}
                  onReady={onReady}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  autoScroll={false}
                  autoCenter={false}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-center h-4">
              {isPlaying ? "Playing..." : "Ready to play"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AudioPlayer;
