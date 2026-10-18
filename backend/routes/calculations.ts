import express, { Request, Response } from 'express';
import { requireSession } from '../middleware/auth.ts';
import {
  FACTOR_LIBRARY,
  IPCC_AR5_GWP,
  calculateDeterministicEmissions,
  CalculationInput,
} from '../services/calculationEngine.ts';
import { firestore } from '../services/firestore.ts';
import type { ActivityRecord, User } from '../models/types.ts';
import { logger } from '../utils/logger.ts';

export const calculationsRouter = express.Router();

/**
 * GET /api/calculations/factors
 * Returns the comprehensive statutory emission factor library
 */
calculationsRouter.get('/factors', requireSession, (req: Request, res: Response) => {
  try {
    const { scopeNo, category, search } = req.query;

    let factors = [...FACTOR_LIBRARY];

    if (scopeNo) {
      factors = factors.filter((f) => f.scopeNo === Number(scopeNo));
    }

    if (category) {
      factors = factors.filter((f) =>
        f.category.toLowerCase().includes(String(category).toLowerCase())
      );
    }

    if (search) {
      const q = String(search).toLowerCase();
      factors = factors.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.factorId.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.factorSource.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      totalCount: factors.length,
      factors,
    });
  } catch (err: unknown) {
    logger.error('Error listing emission factors', { error: err });
    res.status(500).json({ error: 'Failed to retrieve emission factors' });
  }
});

/**
 * GET /api/calculations/gwp-table
 * Returns standard Global Warming Potentials from IPCC AR5
 */
calculationsRouter.get('/gwp-table', requireSession, (_req: Request, res: Response) => {
  res.json({
    standard: 'IPCC Fifth Assessment Report (AR5)',
    timeHorizon: '100 years',
    gwpValues: IPCC_AR5_GWP,
  });
});

/**
 * POST /api/calculations/compute
 * Execute deterministic calculation with full gas breakdown and formula audit
 */
calculationsRouter.post('/compute', requireSession, (req: Request, res: Response) => {
  try {
    const input: CalculationInput = req.body;

    if (!input.scopeNo || ![1, 2, 3].includes(Number(input.scopeNo))) {
      res.status(400).json({ error: 'Valid scopeNo (1, 2, or 3) is required' });
      return;
    }

    const result = calculateDeterministicEmissions(input);

    res.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    logger.error('Error running deterministic calculation', { error: err });
    res.status(500).json({ error: 'Calculation engine error' });
  }
});

/**
 * POST /api/calculations/batch-recalculate
 * Batch recalculates activity records and updates co2e values
 */
calculationsRouter.post('/batch-recalculate', requireSession, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { reportingPeriodId, scopeNo } = req.body;

    const allRecords = firestore.getDocs<ActivityRecord>('activityRecords');
    let matched = allRecords;

    if (reportingPeriodId) {
      matched = matched.filter((r: ActivityRecord) => r.reportingPeriodId === reportingPeriodId);
    }
    if (scopeNo) {
      matched = matched.filter((r: ActivityRecord) => r.scopeNo === Number(scopeNo));
    }

    let updatedCount = 0;
    let totalTonsRecalculated = 0;

    for (const record of matched) {
      const calc = calculateDeterministicEmissions({
        scopeNo: record.scopeNo,
        scope3CategoryNo: record.scope3CategoryNo,
        activityTypeId: record.activityTypeId,
        unitId: record.unitId,
        quantity: record.quantity,
        spendAmount: record.spendAmount,
        renewableFlag: record.scope2Details?.renewableFlag,
        renewablePercentage: record.scope2Details?.renewablePercentage,
        accountingMethod: record.scope2Details?.accountingMethod,
        fuelOrSubstance: record.scope1Details?.fuelSubstanceId,
        isCarbonCapture: record.scope1Details?.category === 'Carbon Capture',
      });

      record.co2e = calc.tCO2e;
      record.updatedAt = Date.now();
      firestore.setDoc('activityRecords', record.activityId, record as unknown as Record<string, unknown>);

      updatedCount++;
      totalTonsRecalculated += calc.tCO2e;
    }

    logger.info(`Batch recalculation completed by user ${user.userId}`, {
      updatedCount,
      totalTonsRecalculated,
    });

    res.json({
      success: true,
      updatedCount,
      totalTonsRecalculated: Math.round(totalTonsRecalculated * 100) / 100,
      message: `Recalculated ${updatedCount} activity records across statutory scopes.`,
    });
  } catch (err: unknown) {
    logger.error('Error during batch recalculation', { error: err });
    res.status(500).json({ error: 'Batch recalculation failed' });
  }
});
