import { prisma } from '../db/client';
import { eventBus } from '../bus/eventBus';
import { config } from '../config';

export class QAAnomalyEngine {
  private static workerTimer: NodeJS.Timeout | null = null;

  /**
   * Rule 1: TAT Breach Monitor
   * Raise a HIGH alert if an urgent specimen stays in IN_PROCESSING for >4 hours without slide creation.
   * (Allows threshold override in hours, defaulting to 4 hours)
   */
  public static async evaluateTATBreaches(thresholdHours: number = 4) {
    const cutoffTime = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    // Find urgent/stat accessions in IN_PROCESSING created before cutoff
    const overdueAccessions = await prisma.accession.findMany({
      where: {
        priority: { in: ['URGENT', 'STAT'] },
        status: { in: ['IN_PROCESSING', 'RECEIVED'] },
        created_at: { lt: cutoffTime }
      },
      include: {
        specimens: {
          include: {
            blocks: {
              include: {
                slides: true
              }
            }
          }
        },
        qa_alerts: {
          where: {
            alert_type: 'TAT_BREACH',
            is_resolved: false
          }
        }
      }
    });

    const newAlerts = [];

    for (const acc of overdueAccessions) {
      // Count total slides
      let totalSlides = 0;
      acc.specimens.forEach(spec => {
        spec.blocks.forEach(block => {
          totalSlides += block.slides.length;
        });
      });

      // If no slides created or still in processing past threshold
      if (totalSlides === 0) {
        // Only raise alert if active unresolved alert doesn't exist
        if (acc.qa_alerts.length === 0) {
          const hoursElapsed = Math.round((Date.now() - new Date(acc.created_at).getTime()) / (1000 * 60 * 60));
          const alert = await prisma.qA_Alert.create({
            data: {
              accession_id: acc.id,
              alert_type: 'TAT_BREACH',
              severity: 'HIGH',
              description: `TAT BREACH: Priority ${acc.priority} accession ${acc.accession_number} has been in processing for ${hoursElapsed}h without slide creation.`
            }
          });

          newAlerts.push(alert);

          eventBus.publish({
            type: 'QA_ALERT',
            accessionId: acc.id,
            payload: alert
          });
        }
      }
    }

    return newAlerts;
  }

  /**
   * Rule 2: Missing Asset Check
   * Prevent report generation/sign-off if expected slides (e.g. H&E control slide)
   * are not marked as SCANNED.
   */
  public static async checkMissingAssets(accessionId: string): Promise<{
    allowed: boolean;
    reason?: string;
    missingSlides: Array<{ id: string; slide_number: string; stain_type: string; status: string }>;
  }> {
    const accession = await prisma.accession.findUnique({
      where: { id: accessionId },
      include: {
        specimens: {
          include: {
            blocks: {
              include: {
                slides: true
              }
            }
          }
        }
      }
    });

    if (!accession) {
      return { allowed: false, reason: 'Accession not found', missingSlides: [] };
    }

    const allSlides: Array<{ id: string; slide_number: string; stain_type: string; status: string }> = [];
    accession.specimens.forEach(s => {
      s.blocks.forEach(b => {
        b.slides.forEach(slide => {
          allSlides.push({
            id: slide.id,
            slide_number: slide.slide_number,
            stain_type: slide.stain_type,
            status: slide.status
          });
        });
      });
    });

    if (allSlides.length === 0) {
      // Auto-record a QA alert if not already logged
      await this.ensureQAAlert(
        accessionId,
        'MISSING_SLIDE',
        'HIGH',
        `Sign-off blocked: Accession ${accession.accession_number} has no generated slides.`
      );
      return {
        allowed: false,
        reason: 'Sign-off blocked: No slides exist for this accession.',
        missingSlides: []
      };
    }

    // Check if any slide is NOT SCANNED (e.g. still CUT or STAINED)
    const unscanned = allSlides.filter(s => s.status !== 'SCANNED' && s.status !== 'ARCHIVED');
    if (unscanned.length > 0) {
      const slideNames = unscanned.map(s => `${s.slide_number} (${s.stain_type}, ${s.status})`).join(', ');
      await this.ensureQAAlert(
        accessionId,
        'MISSING_SLIDE',
        'HIGH',
        `Sign-off blocked: The following slides must be scanned prior to diagnostic sign-off: ${slideNames}`
      );
      return {
        allowed: false,
        reason: `Sign-off blocked: Missing scanned digital slides: ${slideNames}`,
        missingSlides: unscanned
      };
    }

    return { allowed: true, missingSlides: [] };
  }

  /**
   * Rule 3: Critical Value Escalation
   * When a pathologist signs off a report containing predefined critical keywords
   * (e.g., "Malignant", "High-grade carcinoma"), auto-trigger a CRITICAL alert
   * and notify the ordering physician.
   */
  public static async evaluateCriticalDiagnosis(
    accessionId: string,
    impression: string,
    microscopicDescription: string,
    orderingPhysician: string
  ) {
    const combinedText = `${impression} ${microscopicDescription}`.toLowerCase();
    const matchedKeywords = config.criticalKeywords.filter(keyword =>
      combinedText.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      const description = `CRITICAL VALUE ESCALATION: Malignancy/High-Risk finding detected: [${matchedKeywords.join(', ')}]. Priority alert dispatched to ordering physician: Dr. ${orderingPhysician}.`;

      const alert = await prisma.qA_Alert.create({
        data: {
          accession_id: accessionId,
          alert_type: 'CRITICAL_DIAGNOSIS',
          severity: 'CRITICAL',
          description
        }
      });

      // Immutable Chain of Custody notification log
      await prisma.chainOfCustodyLog.create({
        data: {
          entity_type: 'ACCESSION',
          entity_id: accessionId,
          station: 'PATHOLOGY',
          action: 'CRITICAL_VALUE_ESCALATED',
          performed_by: 'QA_AUTOMATION_ROBOT',
          metadata: JSON.stringify({
            matchedKeywords,
            physicianNotified: orderingPhysician,
            timestamp: new Date().toISOString()
          })
        }
      });

      eventBus.publish({
        type: 'QA_ALERT',
        accessionId,
        payload: {
          alert,
          criticalNotificationSent: true,
          physician: orderingPhysician,
          matchedKeywords
        }
      });

      return { isCritical: true, alert, matchedKeywords };
    }

    return { isCritical: false, matchedKeywords: [] };
  }

  /**
   * Helper to avoid duplicate active alerts
   */
  private static async ensureQAAlert(
    accessionId: string,
    alertType: string,
    severity: string,
    description: string
  ) {
    const existing = await prisma.qA_Alert.findFirst({
      where: {
        accession_id: accessionId,
        alert_type: alertType,
        is_resolved: false
      }
    });

    if (!existing) {
      const alert = await prisma.qA_Alert.create({
        data: {
          accession_id: accessionId,
          alert_type: alertType,
          severity,
          description
        }
      });

      eventBus.publish({
        type: 'QA_ALERT',
        accessionId,
        payload: alert
      });

      return alert;
    }

    return existing;
  }

  /**
   * Background Worker Lifecycle
   */
  public static startWorker(intervalMs: number = config.qaWorkerIntervalMs) {
    if (this.workerTimer) return;
    console.log(`🛡️ [QA Worker] Started automated QA anomaly engine (Interval: ${intervalMs}ms)`);

    this.workerTimer = setInterval(async () => {
      try {
        await this.evaluateTATBreaches();
      } catch (err: any) {
        console.error('❌ [QA Worker] Error running QA anomaly scan:', err.message);
      }
    }, intervalMs);
  }

  public static stopWorker() {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
      console.log('🛑 [QA Worker] Stopped.');
    }
  }
}
