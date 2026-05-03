DROP TABLE `clinics`;--> statement-breakpoint
ALTER TABLE `patients` DROP FOREIGN KEY `patients_clinicId_clinics_id_fk`;
--> statement-breakpoint
ALTER TABLE `patients` DROP FOREIGN KEY `patients_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `studies` DROP FOREIGN KEY `studies_clinicId_clinics_id_fk`;
--> statement-breakpoint
ALTER TABLE `users` DROP FOREIGN KEY `users_clinicId_clinics_id_fk`;
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','doctor','patient') NOT NULL DEFAULT 'patient';--> statement-breakpoint
ALTER TABLE `patients` DROP COLUMN `clinicId`;--> statement-breakpoint
ALTER TABLE `patients` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `studies` DROP COLUMN `clinicId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `clinicId`;