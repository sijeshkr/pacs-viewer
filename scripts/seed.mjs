import { drizzle } from "drizzle-orm/mysql2";
import { patients, studies } from "../drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("Seeding database...");

  // Create sample patients
  const samplePatients = [
    {
      patientId: "P001",
      name: "John Doe",
      dateOfBirth: new Date("1980-05-15"),
      gender: "male",
      contactNumber: "+1-555-0101",
      email: "john.doe@example.com",
      address: "123 Main St, New York, NY 10001",
      medicalHistory: "Hypertension, Type 2 Diabetes",
      createdBy: 1,
    },
    {
      patientId: "P002",
      name: "Jane Smith",
      dateOfBirth: new Date("1975-08-22"),
      gender: "female",
      contactNumber: "+1-555-0102",
      email: "jane.smith@example.com",
      address: "456 Oak Ave, Los Angeles, CA 90001",
      medicalHistory: "Asthma, Allergies",
      createdBy: 1,
    },
    {
      patientId: "P003",
      name: "Robert Johnson",
      dateOfBirth: new Date("1965-12-10"),
      gender: "male",
      contactNumber: "+1-555-0103",
      email: "robert.j@example.com",
      address: "789 Pine Rd, Chicago, IL 60601",
      medicalHistory: "Previous MI, Coronary artery disease",
      createdBy: 1,
    },
    {
      patientId: "P004",
      name: "Maria Garcia",
      dateOfBirth: new Date("1990-03-28"),
      gender: "female",
      contactNumber: "+1-555-0104",
      email: "maria.g@example.com",
      address: "321 Elm St, Houston, TX 77001",
      medicalHistory: "None",
      createdBy: 1,
    },
    {
      patientId: "P005",
      name: "David Lee",
      dateOfBirth: new Date("1958-11-05"),
      gender: "male",
      contactNumber: "+1-555-0105",
      email: "david.lee@example.com",
      address: "654 Maple Dr, Phoenix, AZ 85001",
      medicalHistory: "COPD, Former smoker",
      createdBy: 1,
    },
  ];

  console.log("Inserting patients...");
  const insertedPatients = await db.insert(patients).values(samplePatients);
  console.log(`Inserted ${samplePatients.length} patients`);

  // Create sample studies
  const sampleStudies = [
    {
      studyId: "1.2.840.113619.2.55.3.2831158610.123.1",
      patientId: 1,
      studyDate: new Date("2024-11-10"),
      modality: "CT",
      description: "CT Chest with Contrast",
      bodyPart: "Chest",
      referringPhysician: "Dr. Sarah Williams",
      status: "completed",
      priority: "routine",
      numberOfSeries: 3,
      numberOfInstances: 120,
      uploadedBy: 1,
    },
    {
      studyId: "1.2.840.113619.2.55.3.2831158610.456.2",
      patientId: 2,
      studyDate: new Date("2024-11-12"),
      modality: "MRI",
      description: "MRI Brain without Contrast",
      bodyPart: "Brain",
      referringPhysician: "Dr. Michael Chen",
      status: "in_progress",
      priority: "urgent",
      numberOfSeries: 5,
      numberOfInstances: 240,
      uploadedBy: 1,
    },
    {
      studyId: "1.2.840.113619.2.55.3.2831158610.789.3",
      patientId: 3,
      studyDate: new Date("2024-11-13"),
      modality: "XR",
      description: "Chest X-Ray PA and Lateral",
      bodyPart: "Chest",
      referringPhysician: "Dr. Sarah Williams",
      status: "pending",
      priority: "routine",
      numberOfSeries: 2,
      numberOfInstances: 2,
      uploadedBy: 1,
    },
    {
      studyId: "1.2.840.113619.2.55.3.2831158610.101.4",
      patientId: 4,
      studyDate: new Date("2024-11-14"),
      modality: "CT",
      description: "CT Abdomen and Pelvis with Contrast",
      bodyPart: "Abdomen/Pelvis",
      referringPhysician: "Dr. James Brown",
      status: "completed",
      priority: "routine",
      numberOfSeries: 4,
      numberOfInstances: 180,
      uploadedBy: 1,
    },
    {
      studyId: "1.2.840.113619.2.55.3.2831158610.202.5",
      patientId: 5,
      studyDate: new Date("2024-11-14"),
      modality: "CT",
      description: "High Resolution CT Chest",
      bodyPart: "Chest",
      referringPhysician: "Dr. Emily Davis",
      status: "reported",
      priority: "stat",
      numberOfSeries: 2,
      numberOfInstances: 150,
      uploadedBy: 1,
    },
  ];

  console.log("Inserting studies...");
  await db.insert(studies).values(sampleStudies);
  console.log(`Inserted ${sampleStudies.length} studies`);

  console.log("Seeding completed!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
