-- CreateIndex
CREATE UNIQUE INDEX "medication_batches_organizationId_cnp_batchNumber_expiratio_key" ON "medication_batches"("organizationId", "cnp", "batchNumber", "expirationDate");
