export interface ClinicalReport {
  findings: string;
  impression: string;
  recommendations: string;
  status: "draft" | "final" | "amended";
  updatedAt: string;
}

export async function loadClinicalReport(studyId: number): Promise<ClinicalReport | null> {
  const response = await fetch(`/api/reports/${studyId}`, {
    credentials: "include",
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load the radiology report");

  return response.json() as Promise<ClinicalReport>;
}

export async function saveClinicalReport(
  studyId: number,
  report: ClinicalReport,
): Promise<void> {
  const response = await fetch(`/api/reports/${studyId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });

  if (!response.ok) {
    throw new Error("Unable to save the radiology report");
  }
}
