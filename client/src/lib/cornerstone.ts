import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

let isInitialized = false;

export async function initCornerstone() {
  if (isInitialized) {
    return;
  }

  try {
    // Configure WADO Image Loader
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

    // Configure web worker for DICOM parsing
    const config = {
      maxWebWorkers: navigator.hardwareConcurrency || 4,
      startWebWorkersOnDemand: true,
      taskConfiguration: {
        decodeTask: {
          initializeCodecsOnStartup: false,
          strict: false,
        },
      },
    };

    cornerstoneWADOImageLoader.webWorkerManager.initialize(config);

    // Initialize Cornerstone
    await cornerstone.init();

    // Initialize Cornerstone Tools
    cornerstoneTools.init();

    // Add tools
    cornerstoneTools.addTool(cornerstoneTools.PanTool);
    cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
    // Stack scroll will be handled via mouse wheel events
    cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool);
    cornerstoneTools.addTool(cornerstoneTools.LengthTool);
    cornerstoneTools.addTool(cornerstoneTools.AngleTool);
    cornerstoneTools.addTool(cornerstoneTools.EllipticalROITool);
    cornerstoneTools.addTool(cornerstoneTools.RectangleROITool);
    cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool);

    isInitialized = true;
    console.log('Cornerstone initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Cornerstone:', error);
    throw error;
  }
}

export function loadDICOMFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        reject(new Error('Failed to read file'));
        return;
      }

      // Create a blob URL for the DICOM file
      const blob = new Blob([arrayBuffer], { type: 'application/dicom' });
      const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
      resolve(imageId);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function displayDICOMImage(
  element: HTMLDivElement,
  imageId: string,
  toolGroupId: string = 'default'
) {
  try {
    // Enable the element for Cornerstone
    const renderingEngineId = 'myRenderingEngine';
    const viewportId = `viewport-${element.id}`;

    // Get or create rendering engine
    let renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
    if (!renderingEngine) {
      renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);
    }

    // Create viewport
    const viewportInput = {
      viewportId,
      type: cornerstone.Enums.ViewportType.STACK,
      element,
      defaultOptions: {
        background: [0, 0, 0] as [number, number, number],
      },
    };

    renderingEngine.enableElement(viewportInput);

    // Get the viewport
    const viewport = renderingEngine.getViewport(viewportId) as cornerstone.Types.IStackViewport;

    // Load and display the image
    await viewport.setStack([imageId], 0);
    viewport.render();

    // Set up tool group
    let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
    if (!toolGroup) {
      toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId);
      
      if (toolGroup) {
        // Add tools to the tool group
        toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
        toolGroup.addTool(cornerstoneTools.PanTool.toolName);
        toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
        // Stack scroll handled separately
        toolGroup.addTool(cornerstoneTools.LengthTool.toolName);
        toolGroup.addTool(cornerstoneTools.AngleTool.toolName);
        toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);
        toolGroup.addTool(cornerstoneTools.RectangleROITool.toolName);
        toolGroup.addTool(cornerstoneTools.ArrowAnnotateTool.toolName);

        // Set initial tool as active
        toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
        });

        // Stack scroll handled via mouse wheel events
      }
    }

    // Add viewport to tool group
    if (toolGroup) {
      toolGroup.addViewport(viewportId, renderingEngineId);
    }

    return viewport;
  } catch (error) {
    console.error('Failed to display DICOM image:', error);
    throw error;
  }
}

export function setActiveTool(toolName: string, toolGroupId: string = 'default') {
  const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
  if (!toolGroup) {
    console.error('Tool group not found');
    return;
  }

  // Deactivate all tools first
  const tools = [
    cornerstoneTools.WindowLevelTool.toolName,
    cornerstoneTools.PanTool.toolName,
    cornerstoneTools.ZoomTool.toolName,
    cornerstoneTools.LengthTool.toolName,
    cornerstoneTools.AngleTool.toolName,
    cornerstoneTools.EllipticalROITool.toolName,
    cornerstoneTools.RectangleROITool.toolName,
    cornerstoneTools.ArrowAnnotateTool.toolName,
  ];

  tools.forEach((tool) => {
    toolGroup.setToolPassive(tool);
  });

  // Activate the selected tool
  toolGroup.setToolActive(toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
  });
}

export { cornerstone, cornerstoneTools };
