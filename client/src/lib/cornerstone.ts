import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initCornerstone() {
  if (isInitialized) return;

  // Prevent multiple concurrent initializations
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Step 1: Initialize Cornerstone CORE first — must happen before WADO loader
      await cornerstone.init();

      // Step 2: Wire up WADO image loader AFTER core is ready
      cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
      cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

      // Step 3: Configure web worker manager
      const config = {
        maxWebWorkers: Math.min(navigator.hardwareConcurrency || 2, 4),
        startWebWorkersOnDemand: true,
        taskConfiguration: {
          decodeTask: {
            initializeCodecsOnStartup: false,
            strict: false,
          },
        },
      };
      cornerstoneWADOImageLoader.webWorkerManager.initialize(config);

      // Step 4: Initialize tools
      cornerstoneTools.init();

      // Step 5: Register all tools
      const toolsToAdd = [
        cornerstoneTools.PanTool,
        cornerstoneTools.ZoomTool,
        cornerstoneTools.WindowLevelTool,
        cornerstoneTools.LengthTool,
        cornerstoneTools.AngleTool,
        cornerstoneTools.EllipticalROITool,
        cornerstoneTools.RectangleROITool,
        cornerstoneTools.ArrowAnnotateTool,
        cornerstoneTools.StackScrollTool,
      ];

      toolsToAdd.forEach((tool) => {
        try {
          cornerstoneTools.addTool(tool);
        } catch {
          // Tool may already be added — safe to ignore
        }
      });

      isInitialized = true;
      console.log('[Cornerstone] Initialized successfully');
    } catch (error) {
      initPromise = null; // Allow retry on failure
      console.error('[Cornerstone] Initialization failed:', error);
      throw error;
    }
  })();

  return initPromise;
}

export function loadDICOMFile(file: File): string {
  // Register file with WADO URI manager and return imageId
  return cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
}

export async function displayDICOMImage(
  element: HTMLDivElement,
  imageId: string,
  toolGroupId: string = 'default'
) {
  if (!element) throw new Error('Viewport element is null');
  if (!imageId) throw new Error('imageId is required');

  try {
    const renderingEngineId = 'pacsRenderingEngine';
    // Use element's dataset id or generate a stable one
    const viewportId = element.dataset.viewportId || `vp-${Math.random().toString(36).slice(2, 8)}`;
    element.dataset.viewportId = viewportId;

    // Get or create rendering engine
    let renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
    if (!renderingEngine) {
      renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);
    }

    // Enable element if not already enabled
    try {
      renderingEngine.enableElement({
        viewportId,
        type: cornerstone.Enums.ViewportType.STACK,
        element,
        defaultOptions: {
          background: [0, 0, 0] as [number, number, number],
        },
      });
    } catch {
      // Element may already be enabled — continue
    }

    // Get viewport and load image
    const viewport = renderingEngine.getViewport(viewportId) as cornerstone.Types.IStackViewport;
    await viewport.setStack([imageId], 0);
    viewport.render();

    // Set up tool group
    let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
    if (!toolGroup) {
      toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId);

      if (toolGroup) {
        toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
        toolGroup.addTool(cornerstoneTools.PanTool.toolName);
        toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
        toolGroup.addTool(cornerstoneTools.LengthTool.toolName);
        toolGroup.addTool(cornerstoneTools.AngleTool.toolName);
        toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);
        toolGroup.addTool(cornerstoneTools.RectangleROITool.toolName);
        toolGroup.addTool(cornerstoneTools.ArrowAnnotateTool.toolName);
        toolGroup.addTool(cornerstoneTools.StackScrollTool.toolName);

        // Default active tool: Window/Level on left mouse button
        toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
        });

        // Pan on middle mouse button
        toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
        });

        // Zoom on right mouse button
        toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
        });

        // Mouse wheel scroll through stack
        toolGroup.setToolActive(cornerstoneTools.StackScrollTool.toolName, {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Wheel }],
        });
      }
    }

    if (toolGroup) {
      toolGroup.addViewport(viewportId, renderingEngineId);
    }

    return viewport;
  } catch (error) {
    console.error('[Cornerstone] Failed to display image:', error);
    throw error;
  }
}

export function setActiveTool(toolName: string, toolGroupId: string = 'default') {
  const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
  if (!toolGroup) {
    console.warn('[Cornerstone] Tool group not found:', toolGroupId);
    return;
  }

  const allTools = [
    cornerstoneTools.WindowLevelTool.toolName,
    cornerstoneTools.PanTool.toolName,
    cornerstoneTools.ZoomTool.toolName,
    cornerstoneTools.LengthTool.toolName,
    cornerstoneTools.AngleTool.toolName,
    cornerstoneTools.EllipticalROITool.toolName,
    cornerstoneTools.RectangleROITool.toolName,
    cornerstoneTools.ArrowAnnotateTool.toolName,
  ];

  // Deactivate all tools first
  allTools.forEach((tool) => {
    try {
      toolGroup.setToolPassive(tool);
    } catch {
      // Ignore if tool isn't in group
    }
  });

  // Activate the requested tool
  toolGroup.setToolActive(toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
  });
}

export { cornerstone, cornerstoneTools };
