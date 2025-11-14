CREATE TABLE `instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sopInstanceUID` varchar(128) NOT NULL,
	`seriesId` int NOT NULL,
	`instanceNumber` int,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `instances_id` PRIMARY KEY(`id`),
	CONSTRAINT `instances_sopInstanceUID_unique` UNIQUE(`sopInstanceUID`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`dateOfBirth` timestamp,
	`gender` enum('male','female','other'),
	`contactNumber` varchar(50),
	`email` varchar(320),
	`address` text,
	`medicalHistory` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_patientId_unique` UNIQUE(`patientId`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studyId` int NOT NULL,
	`reportedBy` int NOT NULL,
	`findings` text NOT NULL,
	`impression` text NOT NULL,
	`recommendations` text,
	`status` enum('draft','final','amended') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `series` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seriesId` varchar(128) NOT NULL,
	`studyId` int NOT NULL,
	`seriesNumber` int,
	`modality` varchar(16),
	`description` text,
	`numberOfInstances` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `series_id` PRIMARY KEY(`id`),
	CONSTRAINT `series_seriesId_unique` UNIQUE(`seriesId`)
);
--> statement-breakpoint
CREATE TABLE `studies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studyId` varchar(128) NOT NULL,
	`patientId` int NOT NULL,
	`studyDate` timestamp NOT NULL,
	`modality` varchar(16) NOT NULL,
	`description` text,
	`bodyPart` varchar(128),
	`referringPhysician` varchar(255),
	`status` enum('pending','in_progress','completed','reported') NOT NULL DEFAULT 'pending',
	`priority` enum('routine','urgent','stat') NOT NULL DEFAULT 'routine',
	`numberOfSeries` int DEFAULT 0,
	`numberOfInstances` int DEFAULT 0,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studies_id` PRIMARY KEY(`id`),
	CONSTRAINT `studies_studyId_unique` UNIQUE(`studyId`)
);
--> statement-breakpoint
ALTER TABLE `instances` ADD CONSTRAINT `instances_seriesId_series_id_fk` FOREIGN KEY (`seriesId`) REFERENCES `series`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_studyId_studies_id_fk` FOREIGN KEY (`studyId`) REFERENCES `studies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reportedBy_users_id_fk` FOREIGN KEY (`reportedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `series` ADD CONSTRAINT `series_studyId_studies_id_fk` FOREIGN KEY (`studyId`) REFERENCES `studies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studies` ADD CONSTRAINT `studies_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studies` ADD CONSTRAINT `studies_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;