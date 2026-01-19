CREATE TABLE `doctor_patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`patientId` int NOT NULL,
	`isPrimary` int NOT NULL DEFAULT 0,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doctor_patients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studyId` int NOT NULL,
	`doctorId` int NOT NULL,
	`grantedBy` int NOT NULL,
	`accessLevel` enum('view','edit','report') NOT NULL DEFAULT 'view',
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_access_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upload_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`doctorId` int NOT NULL,
	`patientId` int,
	`patientName` varchar(255),
	`patientEmail` varchar(320),
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `upload_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `upload_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','doctor','patient') NOT NULL DEFAULT 'patient';--> statement-breakpoint
ALTER TABLE `doctor_patients` ADD CONSTRAINT `doctor_patients_doctorId_users_id_fk` FOREIGN KEY (`doctorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctor_patients` ADD CONSTRAINT `doctor_patients_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_access` ADD CONSTRAINT `study_access_studyId_studies_id_fk` FOREIGN KEY (`studyId`) REFERENCES `studies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_access` ADD CONSTRAINT `study_access_doctorId_users_id_fk` FOREIGN KEY (`doctorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_access` ADD CONSTRAINT `study_access_grantedBy_users_id_fk` FOREIGN KEY (`grantedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `upload_tokens` ADD CONSTRAINT `upload_tokens_doctorId_users_id_fk` FOREIGN KEY (`doctorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `upload_tokens` ADD CONSTRAINT `upload_tokens_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;