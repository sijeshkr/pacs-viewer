CREATE TABLE `integration_api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`keyPrefix` varchar(32) NOT NULL,
	`keyHash` varchar(64) NOT NULL,
	`fhirReportDeliveryUrl` text,
	`hl7ReportDeliveryUrl` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `integration_api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_api_keys_name_unique` UNIQUE(`name`),
	CONSTRAINT `integration_api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
ALTER TABLE `studies` ADD `accessionNumber` varchar(128);--> statement-breakpoint
ALTER TABLE `studies` ADD `externalOrderId` varchar(128);--> statement-breakpoint
ALTER TABLE `studies` ADD CONSTRAINT `studies_externalOrderId_unique` UNIQUE(`externalOrderId`);--> statement-breakpoint
ALTER TABLE `integration_api_keys` ADD CONSTRAINT `integration_api_keys_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;