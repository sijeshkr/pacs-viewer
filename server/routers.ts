import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Dashboard router
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return await db.getDashboardStats();
    }),
  }),

  // Patients router
  patients: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllPatients();
    }),
    
    search: protectedProcedure
      .input(z.object({ searchTerm: z.string() }))
      .query(async ({ input }) => {
        return await db.searchPatients(input.searchTerm);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPatientById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        patientId: z.string(),
        name: z.string(),
        dateOfBirth: z.date().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        contactNumber: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        medicalHistory: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createPatient({
          ...input,
          createdBy: ctx.user.id,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          dateOfBirth: z.date().optional(),
          gender: z.enum(["male", "female", "other"]).optional(),
          contactNumber: z.string().optional(),
          email: z.string().email().optional(),
          address: z.string().optional(),
          medicalHistory: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updatePatient(input.id, input.data);
        return { success: true };
      }),
  }),

  // Studies router
  studies: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllStudies();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getStudyById(input.id);
      }),
    
    getByPatientId: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getStudiesByPatientId(input.patientId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        studyId: z.string(),
        patientId: z.number(),
        studyDate: z.date(),
        modality: z.string(),
        description: z.string().optional(),
        bodyPart: z.string().optional(),
        referringPhysician: z.string().optional(),
        priority: z.enum(["routine", "urgent", "stat"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createStudy({
          ...input,
          uploadedBy: ctx.user.id,
        });
      }),
    
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "reported"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateStudy(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // Series router
  series: router({
    getByStudyId: protectedProcedure
      .input(z.object({ studyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSeriesByStudyId(input.studyId);
      }),
  }),

  // Instances router
  instances: router({
    getBySeriesId: protectedProcedure
      .input(z.object({ seriesId: z.number() }))
      .query(async ({ input }) => {
        return await db.getInstancesBySeriesId(input.seriesId);
      }),
  }),

  // Reports router
  reports: router({
    getByStudyId: protectedProcedure
      .input(z.object({ studyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getReportsByStudyId(input.studyId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
