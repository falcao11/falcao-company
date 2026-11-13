-- AlterTable
ALTER TABLE "medication_batches" ADD COLUMN     "returnRequestId" TEXT;

-- AddForeignKey
ALTER TABLE "medication_batches" ADD CONSTRAINT "medication_batches_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
