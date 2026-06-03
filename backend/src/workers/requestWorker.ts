import prisma from '../prisma/client';
import { AiClassificationService } from '../services/aiClassificationService';
import { broadcastEvent } from '../sockets/socketManager';

class RequestQueue {
  private queue: string[] = [];
  private isProcessing = false;

  /**
   * Add a request ID to the processing queue
   */
  public enqueue(requestId: string) {
    this.queue.push(requestId);
    console.log(`[Queue] Enqueued request: ${requestId}. Queue length: ${this.queue.length}`);
    this.triggerProcess();
  }

  /**
   * Check queue and trigger worker if idle
   */
  private async triggerProcess() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    this.isProcessing = true;
    
    // Dequeue next request
    const requestId = this.queue.shift();
    if (requestId) {
      try {
        await this.processRequest(requestId);
      } catch (err) {
        console.error(`[Worker] Error processing request ${requestId}:`, err);
      }
    }

    this.isProcessing = false;
    // Process next item
    this.triggerProcess();
  }

  /**
   * Process an individual request:
   * 1. Change status to QUEUED
   * 2. Wait 2-3 seconds
   * 3. Run AI classification
   * 4. Save classification and update status to IN_PROGRESS
   * 5. Record events
   * 6. Broadcast updates
   */
  private async processRequest(requestId: string) {
    console.log(`[Worker] Starting processing for request: ${requestId}`);

    try {
      // 1. Check if request exists
      const request = await prisma.request.findUnique({ where: { id: requestId } });
      if (!request) {
        console.error(`[Worker] Request not found: ${requestId}`);
        return;
      }

      // 2. Set request status to QUEUED in database
      const queuedRequest = await prisma.request.update({
        where: { id: requestId },
        data: { status: 'QUEUED' },
        include: { classification: true, notes: true }
      });
      
      // Log event
      await prisma.requestEvent.create({
        data: {
          requestId,
          eventType: 'QUEUED',
          oldStatus: request.status,
          newStatus: 'QUEUED',
          metadata: JSON.stringify({ message: 'Request placed in background worker queue.' })
        }
      });

      broadcastEvent('request:updated', queuedRequest);
      broadcastEvent('request:queued', { requestId });

      // 3. Simulate async processing (wait 2.5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // 4. Run AI mock classification service
      console.log(`[Worker] Running AI classification for request ${requestId}...`);
      const classificationResult = await AiClassificationService.classifyRequest(request.message);

      // 5. Update database in transaction:
      // - Create Classification
      // - Change Request status to IN_PROGRESS
      // - Record event
      const updatedRequest = await prisma.$transaction(async (tx) => {
        // Create classification
        const classification = await tx.classification.create({
          data: {
            requestId,
            provider: 'mock-keyword-engine',
            category: classificationResult.category,
            priority: classificationResult.priority,
            summary: classificationResult.summary,
            confidence: classificationResult.confidence,
            reason: classificationResult.reason,
            rawOutput: JSON.stringify(classificationResult),
            errorState: false
          }
        });

        // Update request status to IN_PROGRESS
        const req = await tx.request.update({
          where: { id: requestId },
          data: { status: 'IN_PROGRESS' },
          include: { classification: true, notes: true }
        });

        // Record classification event
        await tx.requestEvent.create({
          data: {
            requestId,
            eventType: 'CLASSIFIED',
            oldStatus: 'QUEUED',
            newStatus: 'IN_PROGRESS',
            metadata: JSON.stringify({
              category: classification.category,
              priority: classification.priority,
              confidence: classification.confidence,
              summary: classification.summary,
              reason: classification.reason
            })
          }
        });

        return req;
      });

      console.log(`[Worker] Completed processing for request ${requestId}. Result: ${classificationResult.category} (${classificationResult.priority})`);
      
      // 6. Broadcast updates
      broadcastEvent('request:updated', updatedRequest);
      broadcastEvent('request:classified', { 
        requestId, 
        category: classificationResult.category,
        priority: classificationResult.priority,
        summary: classificationResult.summary
      });

    } catch (err: any) {
      console.error(`[Worker] Failed during execution for request ${requestId}:`, err);
      
      // Mark as error and update status to NEW
      try {
        const failedRequest = await prisma.request.update({
          where: { id: requestId },
          data: { status: 'NEW' },
          include: { classification: true, notes: true }
        });

        await prisma.classification.create({
          data: {
            requestId,
            provider: 'mock-keyword-engine',
            category: 'General Inquiry',
            priority: 'LOW',
            summary: 'Classification failed.',
            confidence: 0,
            reason: err.message || 'Unknown processing error occurred',
            errorState: true
          }
        });

        await prisma.requestEvent.create({
          data: {
            requestId,
            eventType: 'ERROR',
            oldStatus: 'QUEUED',
            newStatus: 'NEW',
            metadata: JSON.stringify({ error: err.message || 'Worker processing failed' })
          }
        });

        broadcastEvent('request:updated', failedRequest);
      } catch (innerErr) {
        console.error('[Worker] Fatal error updating request failure status:', innerErr);
      }
    }
  }

  /**
   * Helper to inspect the current queue length
   */
  public getQueueLength(): number {
    return this.queue.length;
  }
}

export const requestQueue = new RequestQueue();
export default requestQueue;
