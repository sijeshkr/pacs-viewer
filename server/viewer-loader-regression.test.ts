import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("Cornerstone loader regression guard", () => {
  it("uses the version-compatible DICOM image loader and stack display path", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
    const cornerstoneSource = fs.readFileSync(path.join(projectRoot, "client/src/lib/cornerstone.ts"), "utf8");
    const clinicalViewerSource = fs.readFileSync(path.join(projectRoot, "client/src/components/ClinicalDicomViewer.tsx"), "utf8");

    expect(packageJson.dependencies["@cornerstonejs/dicom-image-loader"]).toBe("4.10.2");
    expect(packageJson.dependencies["cornerstone-wado-image-loader"]).toBeUndefined();
    expect(cornerstoneSource).toContain("cornerstoneDICOMImageLoader.init");
    expect(cornerstoneSource).not.toMatch(/from\s+["']cornerstone-wado-image-loader["']/);
    expect(clinicalViewerSource).toContain("displayDICOMStack");
    expect(clinicalViewerSource).toContain("disposeDICOMViewport");
  });
});
