-- Links a defect to the test case that exposed it, so a retest can be scoped
-- without first tracing back through a specific test result.

ALTER TABLE `defects` ADD COLUMN `testCaseId` VARCHAR(191) NULL;

CREATE INDEX `defects_testCaseId_idx` ON `defects`(`testCaseId`);

ALTER TABLE `defects`
  ADD CONSTRAINT `defects_testCaseId_fkey`
  FOREIGN KEY (`testCaseId`) REFERENCES `test_cases`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;