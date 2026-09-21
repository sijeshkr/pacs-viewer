import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  cornerstone,
  cornerstoneTools,
  displayDICOMStack,
  disposeDICOMViewport,
  initCornerstone,
  PACS_RENDERING_ENGINE_ID,
  setActiveTool,
} from "@/lib/cornerstone";
import { exportReportPdf } from "@/lib/reportPdf";
import {
  loadClinicalReport,
  saveClinicalReport,
  type ClinicalReport,
} from "@/lib/reportStorage";
import { toast } from "sonner";
import ClinicalViewerToolbar, {
  type ViewportAction,
} from "./ClinicalViewerToolbar";
import {
  RadialToolMenu,
  DEFAULT_RADIAL_TOOLS,
} from "./ClinicalViewerRadialMenu";
import {
  AlertCircle,
  Download,
  Loader2,
  PanelRight,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
} from "lucide-react";

interface ClinicalDicomViewerProps {
  studyId: number;
  imageIds: string[];
  inline?: boolean;
  patient: {
    name?: string | null;
    patientId?: string | null;
    dateOfBirth?: Date | string | null;
    gender?: string | null;
  } | null;
  study: {
    studyId?: string | null;
    description?: string | null;
    modality?: string | null;
    bodyPart?: string | null;
    studyDate?: Date | string | null;
  } | null;
}

interface DicomMeta {
  patientName?: string;
  patientId?: string;
  patientBirthDate?: string;
  patientSex?: string;
  modality?: string;
  seriesDescription?: string;
  studyDate?: string;
  institutionName?: string;
}

function formatDate(raw: unknown): string {
  if (!raw) return "";
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (typeof raw === "object") {
    const value = raw as { year?: number; month?: number; day?: number };
    if (!value.year) return "";
    return `${value.year}-${String(value.month ?? 1).padStart(2, "0")}-${String(value.day ?? 1).padStart(2, "0")}`;
  }
  const value = String(raw);
  return value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
}

function formatName(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "object") {
    const value = raw as { Alphabetic?: string; alphabetic?: string };
    return (value.Alphabetic ?? value.alphabetic ?? "").replace(/\^/g, " ").trim();
  }
  return String(raw).replace(/\^/g, " ").trim();
}

export function ClinicalDicomViewer({
  studyId,
  imageIds,
  inline = false,
  patient,
  study,
}: ClinicalDicomViewerProps) {
  const primaryViewportRef = useRef<HTMLDivElement>(null);
  const secondaryViewportRef = useRef<HTMLDivElement>(null);
  const toolGroupId = useRef(`clinical-viewer-${crypto.randomUUID()}`);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveToolState] = useState(cornerstoneTools.WindowLevelTool.toolName);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [splitScreen, setSplitScreen] = useState(false);
  const [seriesPanelOpen, setSeriesPanelOpen] = useState(true);
  const [metadata, setMetadata] = useState<DicomMeta>({});
  const [reportOpen, setReportOpen] = useState(false);
  const [hasExistingReport, setHasExistingReport] = useState(false);
  const [report, setReport] = useState<ClinicalReport>({
    findings: "",
    impression: "",
    recommendations: "",
    status: "draft",
    updatedAt: new Date().toISOString(),
  });
  const [radialOpen, setRadialOpen] = useState(false);
  const [radialPosition, setRadialPosition] = useState({ x: 0, y: 0 });

  const totalFrames = Math.max(imageIds.length, 1);
  const viewerClass = inline
    ? "relative flex min-h-[32rem] overflow-hidden rounded-md bg-black"
    : "fixed inset-0 z-50 flex bg-black";

  useEffect(() => {
    let cancelled = false;
    void initCornerstone()
      .then(() => {
        if (!cancelled) setIsInitialized(true);
      })
      .catch((initError: unknown) => {
        if (!cancelled) {
          setError(initError instanceof Error ? initError.message : "Unable to initialize the DICOM viewer");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      disposeDICOMViewport(primaryViewportRef.current);
      disposeDICOMViewport(secondaryViewportRef.current);
    };
  }, []);

  useEffect(() => {
    if (!studyId) return;
    let cancelled = false;
    void loadClinicalReport(studyId)
      .then((savedReport) => {
        if (!cancelled && savedReport) {
          setReport({ ...savedReport, recommendations: savedReport.recommendations ?? "" });
          setHasExistingReport(true);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Unable to load the saved radiology report");
      });
    return () => {
      cancelled = true;
    };
  }, [studyId]);

  const readMetadata = useCallback((imageId: string) => {
    try {
      const patientModule = cornerstone.metaData.get("patientModule", imageId) ?? {};
      const studyModule = cornerstone.metaData.get("generalStudyModule", imageId) ?? {};
      const seriesModule = cornerstone.metaData.get("generalSeriesModule", imageId) ?? {};
      setMetadata({
        patientName: formatName(patientModule.patientName),
        patientId: patientModule.patientId,
        patientBirthDate: formatDate(patientModule.patientBirthDate),
        patientSex: patientModule.patientSex,
        modality: seriesModule.modality,
        seriesDescription: seriesModule.seriesDescription,
        studyDate: formatDate(studyModule.studyDate ?? seriesModule.seriesDate),
        institutionName: studyModule.institutionName,
      });
    } catch {
      // Metadata is optional and may arrive after the image pixels render.
    }
  }, []);

  const loadCurrentImage = useCallback(async () => {
    if (!isInitialized) return;
    if (imageIds.length === 0) {
      setError("This study has no viewable DICOM instances yet.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (primaryViewportRef.current) {
        await displayDICOMStack(primaryViewportRef.current, imageIds, currentFrame, toolGroupId.current);
      }
      if (splitScreen && secondaryViewportRef.current) {
        await displayDICOMStack(
          secondaryViewportRef.current,
          imageIds,
          Math.min(currentFrame + 1, imageIds.length - 1),
          toolGroupId.current,
        );
      }
      readMetadata(imageIds[currentFrame]);
    } catch (loadError: unknown) {
      const message = loadError instanceof Error ? loadError.message : "Unable to render this DICOM image";
      setError(message);
      toast.error("Unable to render the DICOM image");
    } finally {
      setIsLoading(false);
    }
  }, [currentFrame, imageIds, isInitialized, readMetadata, splitScreen]);

  useEffect(() => {
    void loadCurrentImage();
  }, [loadCurrentImage]);

  useEffect(() => {
    if (!isPlaying || imageIds.length < 2) {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
      return;
    }

    playbackIntervalRef.current = setInterval(() => {
      setCurrentFrame((frame) => {
        if (frame < imageIds.length - 1) return frame + 1;
        if (loop) return 0;
        setIsPlaying(false);
        return frame;
      });
    }, 1000 / (30 * playbackSpeed));

    return () => {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    };
  }, [imageIds.length, isPlaying, loop, playbackSpeed]);

  const handleSetTool = useCallback((toolName: string) => {
    setActiveTool(toolName, toolGroupId.current);
    setActiveToolState(toolName);
  }, []);

  const getPrimaryViewport = useCallback(() => {
    const viewportId = primaryViewportRef.current?.dataset.viewportId;
    if (!viewportId) return null;
    return cornerstone.getRenderingEngine(PACS_RENDERING_ENGINE_ID)?.getViewport(viewportId) as
      | cornerstone.Types.IStackViewport
      | undefined;
  }, []);

  const handleViewportAction = useCallback((action: ViewportAction) => {
    const viewport = getPrimaryViewport();
    if (!viewport) return;
    const properties = viewport.getProperties();

    if (action === "reset") {
      viewport.resetCamera();
      viewport.resetProperties();
    }
    if (action === "flipH" || action === "flipV") {
      const camera = viewport.getCamera();
      viewport.setCamera({
        ...camera,
        flipHorizontal: action === "flipH" ? !camera.flipHorizontal : camera.flipHorizontal,
        flipVertical: action === "flipV" ? !camera.flipVertical : camera.flipVertical,
      });
    }
    if (action === "rotateCW") {
      const mutableViewport = viewport as unknown as {
        setProperties: (nextProperties: Record<string, unknown>) => void;
      };
      const rotation = (properties as typeof properties & { rotation?: number }).rotation ?? 0;
      mutableViewport.setProperties({ ...properties, rotation: (rotation + 90) % 360 });
    }
    if (action === "invert") {
      viewport.setProperties({ ...properties, invert: !properties.invert });
    }
    viewport.render();
  }, [getPrimaryViewport]);

  const handleSaveReport = useCallback(async (status: "draft" | "final") => {
    const updatedReport: ClinicalReport = {
      ...report,
      status,
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveClinicalReport(studyId, updatedReport);
      setReport(updatedReport);
      setHasExistingReport(true);
      toast.success(status === "final" ? "Report finalized" : "Report draft saved");
    } catch {
      toast.error("Unable to save the radiology report");
    }
  }, [report, studyId]);

  const radialTools = useMemo(
    () => DEFAULT_RADIAL_TOOLS(
      handleSetTool,
      () => handleViewportAction("reset"),
      () => handleViewportAction("invert"),
    ),
    [handleSetTool, handleViewportAction],
  );

  return (
    <div className={viewerClass}>
      <ClinicalViewerToolbar
        activeTool={activeTool}
        onSetTool={handleSetTool}
        onViewportAction={handleViewportAction}
        onSetLayout={(rows, columns) => setSplitScreen(rows * columns > 1)}
        onToggleCine={() => setIsPlaying((value) => !value)}
        cineActive={isPlaying}
        onToggleReport={() => setReportOpen((value) => !value)}
        reportOpen={reportOpen}
        hasReport={hasExistingReport}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="relative flex min-h-0 flex-1 bg-black"
          onContextMenu={(event) => {
            event.preventDefault();
            setRadialPosition({ x: event.clientX, y: event.clientY });
            setRadialOpen(true);
          }}
        >
          <div className={`relative bg-black ${splitScreen ? "w-1/2 border-r border-gray-700" : "w-full"}`}>
            <div ref={primaryViewportRef} className="h-full w-full" />
            {(metadata.patientName || patient?.name) && (
              <div className="pointer-events-none absolute left-2 top-2 font-mono text-xs leading-snug text-yellow-300 drop-shadow">
                <div>{metadata.patientName || patient?.name}</div>
                {(metadata.patientId || patient?.patientId) && <div>ID: {metadata.patientId || patient?.patientId}</div>}
                {(metadata.patientBirthDate || patient?.dateOfBirth) && <div>DOB: {metadata.patientBirthDate || formatDate(patient?.dateOfBirth)}</div>}
                {(metadata.patientSex || patient?.gender) && <div>Sex: {metadata.patientSex || patient?.gender}</div>}
              </div>
            )}
            {(metadata.modality || study?.modality) && (
              <div className="pointer-events-none absolute right-2 top-2 text-right font-mono text-xs leading-snug text-cyan-300 drop-shadow">
                <div>{metadata.modality || study?.modality}</div>
                {(metadata.studyDate || study?.studyDate) && <div>{metadata.studyDate || formatDate(study?.studyDate)}</div>}
                {(metadata.seriesDescription || study?.description) && <div>{metadata.seriesDescription || study?.description}</div>}
                {metadata.institutionName && <div>{metadata.institutionName}</div>}
              </div>
            )}
            <div className="pointer-events-none absolute bottom-2 left-2 font-mono text-xs text-gray-400 drop-shadow">
              {imageIds.length ? `${currentFrame + 1} / ${totalFrames}` : "No images"}
            </div>
            {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/70"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}
            {error && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-4 text-center">
                <AlertCircle className="mb-2 h-10 w-10 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
                <Button variant="outline" size="sm" onClick={() => void loadCurrentImage()} className="mt-3 border-gray-600 text-white">Retry</Button>
              </div>
            )}
          </div>
          {splitScreen && <div className="relative w-1/2 bg-black"><div ref={secondaryViewportRef} className="h-full w-full" /></div>}
          <button
            type="button"
            onClick={() => setSeriesPanelOpen((value) => !value)}
            className="absolute right-2 top-2 z-10 rounded bg-black/60 p-1.5 text-gray-400 transition-colors hover:bg-black/80 hover:text-white"
            title={seriesPanelOpen ? "Hide series panel" : "Show series panel"}
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>

        {imageIds.length > 1 && (
          <div className="shrink-0 border-t border-gray-700 bg-gray-900 px-3 py-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentFrame((frame) => Math.max(0, frame - 1))} disabled={currentFrame === 0} className="h-7 w-7 border-gray-600 p-0 text-white"><SkipBack className="h-3 w-3" /></Button>
              <Button variant="outline" size="sm" onClick={() => setIsPlaying((value) => !value)} className="h-7 w-7 border-gray-600 p-0 text-white">{isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentFrame((frame) => Math.min(totalFrames - 1, frame + 1))} disabled={currentFrame === totalFrames - 1} className="h-7 w-7 border-gray-600 p-0 text-white"><SkipForward className="h-3 w-3" /></Button>
              <Button variant="outline" size="sm" onClick={() => setLoop((value) => !value)} className={`h-7 w-7 border-gray-600 p-0 text-white ${loop ? "bg-blue-600" : ""}`}><Repeat className="h-3 w-3" /></Button>
              <Slider value={[currentFrame]} onValueChange={(value) => { setCurrentFrame(value[0]); setIsPlaying(false); }} max={totalFrames - 1} step={1} className="flex-1" />
              <span className="whitespace-nowrap text-xs text-gray-400">{currentFrame + 1} / {totalFrames}</span>
              <div className="ml-2 flex items-center gap-1">{[0.25, 0.5, 1, 2, 4].map((speed) => <Button key={speed} variant="outline" size="sm" onClick={() => setPlaybackSpeed(speed)} className={`h-6 border-gray-600 px-1.5 text-xs text-white ${playbackSpeed === speed ? "bg-blue-600" : ""}`}>{speed}x</Button>)}</div>
            </div>
          </div>
        )}
      </div>

      {seriesPanelOpen && imageIds.length > 1 && (
        <div className="flex w-20 shrink-0 flex-col border-l border-gray-800 bg-gray-950">
          <div className="shrink-0 border-b border-gray-800 py-1.5 text-center text-xs text-gray-500">{totalFrames} slices</div>
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-1">
            {imageIds.map((_, index) => <button type="button" key={index} onClick={() => { setCurrentFrame(index); setIsPlaying(false); }} className={`aspect-square w-full rounded border text-xs font-mono transition-colors ${index === currentFrame ? "border-blue-400 bg-blue-600 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"}`}>{index + 1}</button>)}
          </div>
        </div>
      )}

      <RadialToolMenu x={radialPosition.x} y={radialPosition.y} open={radialOpen} onClose={() => setRadialOpen(false)} tools={radialTools} />

      <Sheet open={reportOpen} onOpenChange={setReportOpen}>
        <SheetContent side="right" className="flex w-96 flex-col gap-0 p-0">
          <SheetHeader className="border-b px-4 py-3"><SheetTitle>Radiology Report</SheetTitle></SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Findings<Textarea className="min-h-32 resize-y" placeholder="Describe findings..." value={report.findings} onChange={(event) => setReport((value) => ({ ...value, findings: event.target.value }))} /></label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Impression<Textarea className="min-h-24 resize-y" placeholder="Clinical impression..." value={report.impression} onChange={(event) => setReport((value) => ({ ...value, impression: event.target.value }))} /></label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommendations<Textarea className="min-h-20 resize-y" placeholder="Recommendations (optional)..." value={report.recommendations} onChange={(event) => setReport((value) => ({ ...value, recommendations: event.target.value }))} /></label>
          </div>
          <div className="flex gap-2 border-t p-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => void handleSaveReport("draft")}>Save Draft</Button>
            <Button size="sm" className="flex-1" onClick={() => void handleSaveReport("final")}>Finalize</Button>
            <Button variant="outline" size="sm" title="Export PDF" onClick={() => exportReportPdf({ patient, study, report: { ...report, createdAt: report.updatedAt } })}><Download className="h-3 w-3" /></Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
