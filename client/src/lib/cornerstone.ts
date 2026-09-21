import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";

export const PACS_RENDERING_ENGINE_ID = "pacsRenderingEngine";

let isInitialized = false;
let initPromise: Promise<void> | null = null;

const ALL_TOOLS = [
  cornerstoneTools.WindowLevelTool,
  cornerstoneTools.WindowLevelRegionTool,
  cornerstoneTools.PanTool,
  cornerstoneTools.ZoomTool,
  cornerstoneTools.StackScrollTool,
  cornerstoneTools.MagnifyTool,
  cornerstoneTools.LengthTool,
  cornerstoneTools.BidirectionalTool,
  cornerstoneTools.AngleTool,
  cornerstoneTools.CobbAngleTool,
  cornerstoneTools.ProbeTool,
  cornerstoneTools.EllipticalROITool,
  cornerstoneTools.CircleROITool,
  cornerstoneTools.RectangleROITool,
  cornerstoneTools.PlanarFreehandROITool,
  cornerstoneTools.SplineROITool,
  cornerstoneTools.LivewireContourTool,
  cornerstoneTools.ArrowAnnotateTool,
];

/**
 * Initializes only version-compatible Cornerstone packages. The legacy
 * cornerstone-wado-image-loader is intentionally not used: it dispatches a
 * legacy progress event that is incompatible with Cornerstone 4.
 */
export async function initCornerstone(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await cornerstone.init();
      cornerstoneDICOMImageLoader.init({
        maxWebWorkers: Math.min(navigator.hardwareConcurrency || 2, 4),
      });
      cornerstoneTools.init();

      ALL_TOOLS.forEach((tool) => {
        try {
          cornerstoneTools.addTool(tool);
        } catch {
          // Tools are process-wide. A second mounted viewer can safely reuse them.
        }
      });

      isInitialized = true;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

export function loadDICOMFile(file: File): string {
  return cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
}

function getViewportId(element: HTMLDivElement): string {
  const existingId = element.dataset.viewportId;
  if (existingId) return existingId;

  const viewportId = `pacs-vp-${crypto.randomUUID()}`;
  element.dataset.viewportId = viewportId;
  return viewportId;
}

function getOrCreateRenderingEngine(): cornerstone.RenderingEngine {
  const existing = cornerstone.getRenderingEngine(PACS_RENDERING_ENGINE_ID);
  return existing ?? new cornerstone.RenderingEngine(PACS_RENDERING_ENGINE_ID);
}

function getOrCreateToolGroup(toolGroupId: string) {
  let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
  if (toolGroup) return toolGroup;

  toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId);
  if (!toolGroup) {
    throw new Error("Unable to create the DICOM tool group");
  }

  ALL_TOOLS.forEach((tool) => toolGroup!.addTool(tool.toolName));
  toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
  });
  toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
  });
  toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
  });
  toolGroup.setToolActive(cornerstoneTools.StackScrollTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Wheel }],
  });

  return toolGroup;
}

function ensureViewport(
  element: HTMLDivElement,
  toolGroupId: string,
): cornerstone.Types.IStackViewport {
  const renderingEngine = getOrCreateRenderingEngine();
  const viewportId = getViewportId(element);
  let viewport = renderingEngine.getViewport(viewportId) as cornerstone.Types.IStackViewport | undefined;

  if (!viewport) {
    renderingEngine.enableElement({
      viewportId,
      type: cornerstone.Enums.ViewportType.STACK,
      element,
      defaultOptions: {
        background: [0, 0, 0],
      },
    });
    viewport = renderingEngine.getViewport(viewportId) as cornerstone.Types.IStackViewport;
  }

  const currentToolGroup = cornerstoneTools.ToolGroupManager.getToolGroupForViewport(
    viewportId,
    PACS_RENDERING_ENGINE_ID,
  );
  if (currentToolGroup && currentToolGroup.id !== toolGroupId) {
    currentToolGroup.removeViewports(PACS_RENDERING_ENGINE_ID, viewportId);
  }

  if (!currentToolGroup || currentToolGroup.id !== toolGroupId) {
    getOrCreateToolGroup(toolGroupId).addViewport(viewportId, PACS_RENDERING_ENGINE_ID);
  }

  return viewport;
}

export async function displayDICOMStack(
  element: HTMLDivElement,
  imageIds: string[],
  imageIndex = 0,
  toolGroupId = "default",
): Promise<cornerstone.Types.IStackViewport> {
  if (!element) throw new Error("Viewport element is not available");
  if (imageIds.length === 0) throw new Error("No DICOM images were supplied");

  const viewport = ensureViewport(element, toolGroupId);
  const boundedIndex = Math.min(Math.max(imageIndex, 0), imageIds.length - 1);
  await viewport.setStack(imageIds, boundedIndex);
  viewport.render();
  return viewport;
}

export async function displayDICOMImage(
  element: HTMLDivElement,
  imageId: string,
  toolGroupId = "default",
): Promise<cornerstone.Types.IStackViewport> {
  if (!imageId) throw new Error("A DICOM image identifier is required");
  return displayDICOMStack(element, [imageId], 0, toolGroupId);
}

export function disposeDICOMViewport(element: HTMLDivElement | null): void {
  const viewportId = element?.dataset.viewportId;
  if (!viewportId) return;

  const renderingEngine = cornerstone.getRenderingEngine(PACS_RENDERING_ENGINE_ID);
  const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroupForViewport(
    viewportId,
    PACS_RENDERING_ENGINE_ID,
  );

  try {
    toolGroup?.removeViewports(PACS_RENDERING_ENGINE_ID, viewportId);
    renderingEngine?.disableElement(viewportId);
  } finally {
    delete element.dataset.viewportId;
  }
}

export function setActiveTool(toolName: string, toolGroupId = "default"): void {
  const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
  if (!toolGroup) return;

  Object.keys(toolGroup.toolOptions).forEach((name) => {
    try {
      toolGroup.setToolPassive(name);
    } catch {
      // Some tools are only configured for non-primary bindings.
    }
  });

  toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
  });
  toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
  });
  toolGroup.setToolActive(cornerstoneTools.StackScrollTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Wheel }],
  });
  toolGroup.setToolActive(toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
  });
}

export { cornerstone, cornerstoneTools };
