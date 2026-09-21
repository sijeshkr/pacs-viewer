import { eq, desc, and, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, patients, studies, series, instances, reports, InsertPatient, InsertStudy, doctorPatients, InsertDoctorPatient, studyAccess, InsertStudyAccess, uploadTokens, InsertUploadToken, integrationApiKeys, type InsertIntegrationApiKey } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Patient queries
export async function getAllPatients() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(patients).orderBy(desc(patients.createdAt));
}

export async function getPatientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchPatients(searchTerm: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(patients).where(
    sql`${patients.name} LIKE ${`%${searchTerm}%`} OR ${patients.patientId} LIKE ${`%${searchTerm}%`}`
  ).orderBy(desc(patients.createdAt));
}

export async function createPatient(patient: InsertPatient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(patients).values(patient);
  return result;
}

export async function updatePatient(id: number, patient: Partial<InsertPatient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(patients).set(patient).where(eq(patients.id, id));
}

// Study queries
export async function getAllStudies() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      study: studies,
      patient: patients,
    })
    .from(studies)
    .leftJoin(patients, eq(studies.patientId, patients.id))
    .orderBy(desc(studies.studyDate));
  
  return result;
}

export async function getStudiesByPatientId(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(studies).where(eq(studies.patientId, patientId)).orderBy(desc(studies.studyDate));
}

export async function getStudyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select({
      study: studies,
      patient: patients,
    })
    .from(studies)
    .leftJoin(patients, eq(studies.patientId, patients.id))
    .where(eq(studies.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createStudy(study: InsertStudy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(studies).values(study);
  return result;
}

export async function updateStudy(id: number, study: Partial<InsertStudy>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(studies).set(study).where(eq(studies.id, id));
}

// Series queries
export async function getSeriesByStudyId(studyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(series).where(eq(series.studyId, studyId));
}

// Instance queries
export async function getInstancesBySeriesId(seriesId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(instances).where(eq(instances.seriesId, seriesId));
}

// Report queries
export async function getReportsByStudyId(studyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(reports).where(eq(reports.studyId, studyId)).orderBy(desc(reports.createdAt));
}

export async function getLatestReportByStudyId(studyId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(reports)
    .where(eq(reports.studyId, studyId))
    .orderBy(desc(reports.updatedAt))
    .limit(1);
  return result[0];
}

export async function saveStudyReport(input: {
  studyId: number;
  reportedBy: number;
  findings: string;
  impression: string;
  recommendations?: string;
  status: "draft" | "final" | "amended";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const latest = await getLatestReportByStudyId(input.studyId);
  if (latest) {
    await db.update(reports).set({
      findings: input.findings,
      impression: input.impression,
      recommendations: input.recommendations ?? null,
      status: input.status,
      reportedBy: input.reportedBy,
    }).where(eq(reports.id, latest.id));
  } else {
    await db.insert(reports).values({
      studyId: input.studyId,
      reportedBy: input.reportedBy,
      findings: input.findings,
      impression: input.impression,
      recommendations: input.recommendations ?? null,
      status: input.status,
    });
  }

  if (input.status === "final" || input.status === "amended") {
    await db.update(studies).set({ status: "reported" }).where(eq(studies.id, input.studyId));
  }

  return getLatestReportByStudyId(input.studyId);
}

export async function getStudyByDicomUid(studyUid: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select({ study: studies, patient: patients })
    .from(studies)
    .leftJoin(patients, eq(studies.patientId, patients.id))
    .where(eq(studies.studyId, studyUid))
    .limit(1);
  return result[0];
}

export async function getStudyByExternalOrderId(externalOrderId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select({ study: studies, patient: patients })
    .from(studies)
    .leftJoin(patients, eq(studies.patientId, patients.id))
    .where(eq(studies.externalOrderId, externalOrderId))
    .limit(1);
  return result[0];
}

export async function upsertInteroperabilityOrder(input: {
  patientId: string;
  patientName: string;
  patientDateOfBirth?: string;
  patientGender?: "male" | "female" | "other";
  studyUid: string;
  studyDate: Date;
  modality: string;
  description?: string;
  bodyPart?: string;
  referringPhysician?: string;
  accessionNumber?: string;
  externalOrderId: string;
  priority?: "routine" | "urgent" | "stat";
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existingOrder = await getStudyByExternalOrderId(input.externalOrderId);
  if (existingOrder) return { ...existingOrder, created: false };

  let patient = (await db.select().from(patients).where(eq(patients.patientId, input.patientId)).limit(1))[0];
  const dateOfBirth = input.patientDateOfBirth ? new Date(`${input.patientDateOfBirth}T00:00:00.000Z`) : null;

  if (!patient) {
    const created = await db.insert(patients).values({
      patientId: input.patientId,
      name: input.patientName,
      dateOfBirth,
      gender: input.patientGender,
      createdBy: input.createdBy,
    });
    patient = (await db.select().from(patients).where(eq(patients.id, Number(created[0].insertId))).limit(1))[0]!;
  } else {
    await db.update(patients).set({
      name: input.patientName || patient.name,
      dateOfBirth: dateOfBirth ?? patient.dateOfBirth,
      gender: input.patientGender ?? patient.gender,
    }).where(eq(patients.id, patient.id));
    patient = (await db.select().from(patients).where(eq(patients.id, patient.id)).limit(1))[0]!;
  }

  const existingStudy = await getStudyByDicomUid(input.studyUid);
  if (existingStudy) return { ...existingStudy, created: false };

  const createdStudy = await db.insert(studies).values({
    studyId: input.studyUid,
    patientId: patient.id,
    studyDate: input.studyDate,
    modality: input.modality,
    description: input.description,
    bodyPart: input.bodyPart,
    referringPhysician: input.referringPhysician,
    accessionNumber: input.accessionNumber,
    externalOrderId: input.externalOrderId,
    priority: input.priority ?? "routine",
    uploadedBy: input.createdBy,
  });

  const study = (await db.select().from(studies).where(eq(studies.id, Number(createdStudy[0].insertId))).limit(1))[0]!;
  return { study, patient, created: true };
}

// External API key queries
export async function createIntegrationApiKey(apiKey: InsertIntegrationApiKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(integrationApiKeys).values(apiKey);
  return Number(result[0].insertId);
}

export async function listIntegrationApiKeys() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: integrationApiKeys.id,
    name: integrationApiKeys.name,
    keyPrefix: integrationApiKeys.keyPrefix,
    fhirReportDeliveryUrl: integrationApiKeys.fhirReportDeliveryUrl,
    hl7ReportDeliveryUrl: integrationApiKeys.hl7ReportDeliveryUrl,
    isActive: integrationApiKeys.isActive,
    createdAt: integrationApiKeys.createdAt,
    lastUsedAt: integrationApiKeys.lastUsedAt,
    revokedAt: integrationApiKeys.revokedAt,
  }).from(integrationApiKeys).orderBy(desc(integrationApiKeys.createdAt));
}

export async function getActiveIntegrationApiKey(keyHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(integrationApiKeys)
    .where(and(eq(integrationApiKeys.keyHash, keyHash), eq(integrationApiKeys.isActive, 1)))
    .limit(1);
  return result[0];
}

export async function touchIntegrationApiKey(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(integrationApiKeys).set({ lastUsedAt: new Date() }).where(eq(integrationApiKeys.id, id));
}

export async function revokeIntegrationApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(integrationApiKeys).set({ isActive: 0, revokedAt: new Date() }).where(eq(integrationApiKeys.id, id));
}

// Dashboard statistics
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return {
    totalPatients: 0,
    totalStudies: 0,
    pendingStudies: 0,
    completedStudies: 0,
  };
  
  const [patientsCount] = await db.select({ count: sql<number>`count(*)` }).from(patients);
  const [studiesCount] = await db.select({ count: sql<number>`count(*)` }).from(studies);
  const [pendingCount] = await db.select({ count: sql<number>`count(*)` }).from(studies).where(eq(studies.status, 'pending'));
  const [completedCount] = await db.select({ count: sql<number>`count(*)` }).from(studies).where(eq(studies.status, 'completed'));
  
  return {
    totalPatients: Number(patientsCount.count),
    totalStudies: Number(studiesCount.count),
    pendingStudies: Number(pendingCount.count),
    completedStudies: Number(completedCount.count),
  };
}

// Doctor-Patient relationship queries
export async function assignPatientToDoctor(doctorId: number, patientId: number, isPrimary: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(doctorPatients).values({
    doctorId,
    patientId,
    isPrimary: isPrimary ? 1 : 0,
  });
}

export async function getDoctorPatients(doctorId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      patient: patients,
      relationship: doctorPatients,
    })
    .from(doctorPatients)
    .leftJoin(patients, eq(doctorPatients.patientId, patients.id))
    .where(eq(doctorPatients.doctorId, doctorId))
    .orderBy(desc(doctorPatients.isPrimary), desc(patients.createdAt));
  
  return result;
}

export async function getPatientDoctors(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      doctor: users,
      relationship: doctorPatients,
    })
    .from(doctorPatients)
    .leftJoin(users, eq(doctorPatients.doctorId, users.id))
    .where(eq(doctorPatients.patientId, patientId))
    .orderBy(desc(doctorPatients.isPrimary));
  
  return result;
}

// Study access/sharing queries
export async function grantStudyAccess(studyId: number, doctorId: number, grantedBy: number, accessLevel: "view" | "edit" | "report" = "view") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(studyAccess).values({
    studyId,
    doctorId,
    grantedBy,
    accessLevel,
  });
}

export async function getStudyAccessList(studyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      doctor: users,
      access: studyAccess,
    })
    .from(studyAccess)
    .leftJoin(users, eq(studyAccess.doctorId, users.id))
    .where(eq(studyAccess.studyId, studyId));
  
  return result;
}

export async function getDoctorAccessibleStudies(doctorId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      study: studies,
      patient: patients,
      access: studyAccess,
    })
    .from(studyAccess)
    .leftJoin(studies, eq(studyAccess.studyId, studies.id))
    .leftJoin(patients, eq(studies.patientId, patients.id))
    .where(eq(studyAccess.doctorId, doctorId))
    .orderBy(desc(studies.studyDate));
  
  return result;
}

export async function revokeStudyAccess(studyId: number, doctorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(studyAccess).where(
    sql`${studyAccess.studyId} = ${studyId} AND ${studyAccess.doctorId} = ${doctorId}`
  );
}

// Upload token queries
export async function createUploadToken(token: InsertUploadToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(uploadTokens).values(token);
  return result;
}

export async function getUploadTokenByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(uploadTokens).where(eq(uploadTokens.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markTokenAsUsed(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(uploadTokens).set({
    usedAt: new Date(),
    isActive: 0,
  }).where(eq(uploadTokens.token, token));
}

export async function getDoctorUploadTokens(doctorId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(uploadTokens).where(eq(uploadTokens.doctorId, doctorId)).orderBy(desc(uploadTokens.createdAt));
}
