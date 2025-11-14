import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patients table for storing patient information
 */
export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  patientId: varchar("patientId", { length: 64 }).notNull().unique(), // Hospital patient ID
  name: varchar("name", { length: 255 }).notNull(),
  dateOfBirth: date("dateOfBirth"),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  contactNumber: varchar("contactNumber", { length: 50 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  medicalHistory: text("medicalHistory"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * Studies table for storing DICOM studies
 */
export const studies = mysqlTable("studies", {
  id: int("id").autoincrement().primaryKey(),
  studyId: varchar("studyId", { length: 128 }).notNull().unique(), // DICOM Study Instance UID
  patientId: int("patientId").notNull().references(() => patients.id),
  studyDate: timestamp("studyDate").notNull(),
  modality: varchar("modality", { length: 16 }).notNull(), // CT, MRI, XR, etc.
  description: text("description"),
  bodyPart: varchar("bodyPart", { length: 128 }),
  referringPhysician: varchar("referringPhysician", { length: 255 }),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "reported"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["routine", "urgent", "stat"]).default("routine").notNull(),
  numberOfSeries: int("numberOfSeries").default(0),
  numberOfInstances: int("numberOfInstances").default(0),
  uploadedBy: int("uploadedBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Study = typeof studies.$inferSelect;
export type InsertStudy = typeof studies.$inferInsert;

/**
 * Series table for storing DICOM series within studies
 */
export const series = mysqlTable("series", {
  id: int("id").autoincrement().primaryKey(),
  seriesId: varchar("seriesId", { length: 128 }).notNull().unique(), // DICOM Series Instance UID
  studyId: int("studyId").notNull().references(() => studies.id),
  seriesNumber: int("seriesNumber"),
  modality: varchar("modality", { length: 16 }),
  description: text("description"),
  numberOfInstances: int("numberOfInstances").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Series = typeof series.$inferSelect;
export type InsertSeries = typeof series.$inferInsert;

/**
 * Instances table for storing individual DICOM images
 */
export const instances = mysqlTable("instances", {
  id: int("id").autoincrement().primaryKey(),
  sopInstanceUID: varchar("sopInstanceUID", { length: 128 }).notNull().unique(), // DICOM SOP Instance UID
  seriesId: int("seriesId").notNull().references(() => series.id),
  instanceNumber: int("instanceNumber"),
  fileUrl: text("fileUrl").notNull(), // S3 URL to DICOM file
  fileKey: text("fileKey").notNull(), // S3 file key
  fileSize: int("fileSize"), // File size in bytes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Instance = typeof instances.$inferSelect;
export type InsertInstance = typeof instances.$inferInsert;

/**
 * Reports table for radiologist reports
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  studyId: int("studyId").notNull().references(() => studies.id),
  reportedBy: int("reportedBy").notNull().references(() => users.id),
  findings: text("findings").notNull(),
  impression: text("impression").notNull(),
  recommendations: text("recommendations"),
  status: mysqlEnum("status", ["draft", "final", "amended"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;