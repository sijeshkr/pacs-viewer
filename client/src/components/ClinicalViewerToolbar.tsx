import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  SunMedium, Move, ZoomIn, ScanSearch, Layers,
  Ruler, ArrowLeftRight, Triangle, CornerUpRight, Pipette,
  Circle, CircleDot, Square, PenLine, Spline, Waypoints, ArrowUpRight, Crop,
  RotateCw, FlipHorizontal2, FlipVertical2, RefreshCw, Contrast,
  Play, Pause, FileText, Grid2x2, LayoutTemplate,
} from "lucide-react";
import { useState } from "react";

export type ViewportAction = "reset" | "flipH" | "flipV" | "rotateCW" | "invert";

interface ToolbarProps {
  activeTool: string | null;
  onSetTool: (toolName: string) => void;
  onViewportAction: (action: ViewportAction) => void;
  onSetLayout: (rows: number, cols: number) => void;
  onToggleCine: () => void;
  cineActive: boolean;
  onToggleReport: () => void;
  reportOpen: boolean;
  hasReport: boolean;
}

interface ToolBtn {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  isTool?: boolean;
}

export default function Toolbar({
  activeTool,
  onSetTool,
  onViewportAction,
  onSetLayout,
  onToggleCine,
  cineActive,
  onToggleReport,
  reportOpen,
  hasReport,
}: ToolbarProps) {
  const [localCine, setLocalCine] = useState(cineActive);

  const toggleCine = () => {
    setLocalCine((v) => !v);
    onToggleCine();
  };

  // ── Group 1: Navigation ───────────────────────────────────────────────
  const navTools: ToolBtn[] = [
    { id: "WindowLevel", label: "Window / Level", icon: <SunMedium className="w-4 h-4" />, action: () => onSetTool("WindowLevel"), isTool: true },
    { id: "Pan",         label: "Pan",             icon: <Move className="w-4 h-4" />,      action: () => onSetTool("Pan"),         isTool: true },
    { id: "Zoom",        label: "Zoom",            icon: <ZoomIn className="w-4 h-4" />,    action: () => onSetTool("Zoom"),        isTool: true },
    { id: "StackScroll", label: "Stack Scroll",    icon: <Layers className="w-4 h-4" />,    action: () => onSetTool("StackScroll"), isTool: true },
    { id: "Magnify",     label: "Magnify Probe",   icon: <ScanSearch className="w-4 h-4" />,action: () => onSetTool("Magnify"),     isTool: true },
  ];

  // ── Group 2: Measurements ─────────────────────────────────────────────
  const measureTools: ToolBtn[] = [
    { id: "Length",        label: "Length",          icon: <Ruler className="w-4 h-4" />,         action: () => onSetTool("Length"),        isTool: true },
    { id: "Bidirectional", label: "Bidirectional",   icon: <ArrowLeftRight className="w-4 h-4" />, action: () => onSetTool("Bidirectional"), isTool: true },
    { id: "Angle",         label: "Angle",           icon: <Triangle className="w-4 h-4" />,       action: () => onSetTool("Angle"),         isTool: true },
    { id: "CobbAngle",     label: "Cobb Angle",      icon: <CornerUpRight className="w-4 h-4" />,  action: () => onSetTool("CobbAngle"),     isTool: true },
    { id: "Probe",         label: "Probe",           icon: <Pipette className="w-4 h-4" />,        action: () => onSetTool("Probe"),         isTool: true },
  ];

  // ── Group 3: ROI & Annotation ─────────────────────────────────────────
  const roiTools: ToolBtn[] = [
    { id: "EllipticalROI",     label: "Ellipse ROI",     icon: <Circle className="w-4 h-4" />,       action: () => onSetTool("EllipticalROI"),     isTool: true },
    { id: "CircleROI",         label: "Circle ROI",      icon: <CircleDot className="w-4 h-4" />,    action: () => onSetTool("CircleROI"),         isTool: true },
    { id: "RectangleROI",      label: "Rectangle ROI",   icon: <Square className="w-4 h-4" />,       action: () => onSetTool("RectangleROI"),      isTool: true },
    { id: "PlanarFreehandROI", label: "Freehand ROI",    icon: <PenLine className="w-4 h-4" />,      action: () => onSetTool("PlanarFreehandROI"), isTool: true },
    { id: "SplineROI",         label: "Spline ROI",      icon: <Spline className="w-4 h-4" />,       action: () => onSetTool("SplineROI"),         isTool: true },
    { id: "LivewireContour",   label: "Livewire Contour",icon: <Waypoints className="w-4 h-4" />,    action: () => onSetTool("LivewireContour"),   isTool: true },
    { id: "ArrowAnnotate",     label: "Arrow Annotate",  icon: <ArrowUpRight className="w-4 h-4" />, action: () => onSetTool("ArrowAnnotate"),     isTool: true },
    { id: "WindowLevelRegion", label: "W/L Region",      icon: <Crop className="w-4 h-4" />,         action: () => onSetTool("WindowLevelRegion"), isTool: true },
  ];

  // ── Group 5: Viewport operations ──────────────────────────────────────
  const viewportOps: ToolBtn[] = [
    { id: "Reset",    label: "Reset Viewport",  icon: <RefreshCw className="w-4 h-4" />,       action: () => onViewportAction("reset") },
    { id: "FlipH",    label: "Flip Horizontal", icon: <FlipHorizontal2 className="w-4 h-4" />, action: () => onViewportAction("flipH") },
    { id: "FlipV",    label: "Flip Vertical",   icon: <FlipVertical2 className="w-4 h-4" />,   action: () => onViewportAction("flipV") },
    { id: "RotateCW", label: "Rotate CW",       icon: <RotateCw className="w-4 h-4" />,        action: () => onViewportAction("rotateCW") },
    { id: "Invert",   label: "Invert Colors",   icon: <Contrast className="w-4 h-4" />,        action: () => onViewportAction("invert") },
  ];

  const layouts = [
    { label: "1×1", rows: 1, cols: 1, icon: <div className="w-3 h-3 border border-current rounded-sm" /> },
    { label: "2×1", rows: 2, cols: 1, icon: <div className="w-3 h-3 flex flex-col gap-0.5"><div className="flex-1 border border-current rounded-sm" /><div className="flex-1 border border-current rounded-sm" /></div> },
    { label: "1×2", rows: 1, cols: 2, icon: <div className="w-3 h-3 flex gap-0.5"><div className="flex-1 border border-current rounded-sm" /><div className="flex-1 border border-current rounded-sm" /></div> },
    { label: "2×2", rows: 2, cols: 2, icon: <Grid2x2 className="w-3.5 h-3.5" /> },
  ];

  const renderBtn = (btn: ToolBtn) => {
    const isActive = btn.isTool && activeTool === btn.id;
    return (
      <Tooltip key={btn.id}>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            size="icon"
            className="w-9 h-9"
            onClick={btn.action}
          >
            {btn.icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{btn.label}</TooltipContent>
      </Tooltip>
    );
  };

  const divider = (key: string) => <div key={key} className="w-6 h-px bg-border my-1" />;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col items-center gap-0.5 bg-background/90 backdrop-blur-sm border-r border-border py-2 px-1 w-12 h-full pointer-events-auto overflow-y-auto">

        {/* Cine playback */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={localCine ? "secondary" : "ghost"}
              size="icon"
              className={`w-9 h-9 ${localCine ? "text-blue-400" : ""}`}
              onClick={toggleCine}
            >
              {localCine ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{localCine ? "Pause Cine" : "Play Cine"}</TooltipContent>
        </Tooltip>
        {divider("d0")}

        {navTools.map(renderBtn)}
        {divider("d1")}

        {measureTools.map(renderBtn)}
        {divider("d2")}

        {roiTools.map(renderBtn)}
        {divider("d3")}

        {viewportOps.map(renderBtn)}
        {divider("d4")}

        {/* Layout switcher */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">
              <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">Layouts</TooltipContent>
        </Tooltip>
        <div className="flex flex-col gap-0.5 mt-0.5 w-full items-center">
          {layouts.map((l) => (
            <Tooltip key={l.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-7 p-0"
                  onClick={() => onSetLayout(l.rows, l.cols)}
                >
                  {l.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">{l.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="flex-1" />
        {divider("d5")}

        {/* Report toggle — pinned to bottom */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={reportOpen ? "secondary" : "ghost"}
              size="icon"
              className="w-9 h-9 relative"
              onClick={onToggleReport}
            >
              <FileText className="w-4 h-4" />
              {hasReport && !reportOpen && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">Radiology Report</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
