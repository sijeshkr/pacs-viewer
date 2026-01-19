import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Grid2X2,
  Maximize2,
} from "lucide-react";

interface EnhancedDicomViewerProps {
  imageIds: string[];
  onClose?: () => void;
}

export function EnhancedDicomViewer({ imageIds, onClose }: EnhancedDicomViewerProps) {
  const viewportRef1 = useRef<HTMLDivElement>(null);
  const viewportRef2 = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [splitScreen, setSplitScreen] = useState(false);
  const [totalFrames, setTotalFrames] = useState(imageIds.length);
  
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Cornerstone viewport
  useEffect(() => {
    // TODO: Initialize Cornerstone.js viewport
    // This will be implemented with proper Cornerstone.js setup
    setTotalFrames(imageIds.length);
  }, [imageIds]);

  // Cine playback logic
  useEffect(() => {
    if (isPlaying) {
      const frameTime = 1000 / (30 * playbackSpeed); // 30 FPS base
      
      playbackIntervalRef.current = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= totalFrames - 1) {
            if (loop) {
              return 0;
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return prev + 1;
        });
      }, frameTime);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, loop, totalFrames]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePreviousFrame = () => {
    setCurrentFrame((prev) => Math.max(0, prev - 1));
  };

  const handleNextFrame = () => {
    setCurrentFrame((prev) => Math.min(totalFrames - 1, prev + 1));
  };

  const handleFrameChange = (value: number[]) => {
    setCurrentFrame(value[0]);
    setIsPlaying(false);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const toggleSplitScreen = () => {
    setSplitScreen(!splitScreen);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
        <h2 className="text-white text-lg font-semibold">DICOM Viewer</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSplitScreen}
            className="text-white border-gray-600"
          >
            <Grid2X2 className="w-4 h-4 mr-2" />
            {splitScreen ? "Single View" : "Split Screen"}
          </Button>
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-white border-gray-600"
            >
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 flex">
        {/* Main Viewport */}
        <div className={splitScreen ? "w-1/2 border-r border-gray-700" : "w-full"}>
          <div
            ref={viewportRef1}
            className="w-full h-full bg-black flex items-center justify-center"
          >
            <div className="text-gray-400">
              Viewport 1 - Frame {currentFrame + 1} / {totalFrames}
            </div>
          </div>
        </div>

        {/* Secondary Viewport (Split Screen) */}
        {splitScreen && (
          <div className="w-1/2">
            <div
              ref={viewportRef2}
              className="w-full h-full bg-black flex items-center justify-center"
            >
              <div className="text-gray-400">
                Viewport 2 - Frame {currentFrame + 1} / {totalFrames}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cine Controls */}
      {totalFrames > 1 && (
        <div className="bg-gray-900 border-t border-gray-700 p-4">
          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousFrame}
              disabled={currentFrame === 0}
              className="text-white border-gray-600"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
              className="text-white border-gray-600"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextFrame}
              disabled={currentFrame === totalFrames - 1}
              className="text-white border-gray-600"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLoop(!loop)}
              className={`text-white border-gray-600 ${loop ? "bg-blue-600" : ""}`}
            >
              <Repeat className="w-4 h-4" />
            </Button>
          </div>

          {/* Frame Slider */}
          <div className="mb-4">
            <Slider
              value={[currentFrame]}
              onValueChange={handleFrameChange}
              max={totalFrames - 1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Frame: {currentFrame + 1}</span>
              <span>Total: {totalFrames}</span>
            </div>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-400 text-sm">Speed:</span>
            {[0.25, 0.5, 1, 2, 4].map((speed) => (
              <Button
                key={speed}
                variant="outline"
                size="sm"
                onClick={() => handleSpeedChange(speed)}
                className={`text-white border-gray-600 ${
                  playbackSpeed === speed ? "bg-blue-600" : ""
                }`}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
