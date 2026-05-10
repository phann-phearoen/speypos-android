import * as timeService from './time.service.js';
import * as shiftRepo from '../storage/repositories/shift.repo.js';
import * as orderRepo from '../storage/repositories/order.repo.js';
import { logger } from '../utils/logger.js';
import { sendTelegramEvent } from './telegram.service.js';
import { formatDayCloseMessage } from './telegram.formatter.js';
import { serializeManyShifts } from '../serializers/shift.serializer.js';

/**
 * Reusable internal function to get the context for a day close operation.
 * Fetches the business date and all shifts for that date.
 * @returns {{todayStoreDate: string, shiftsForDate: Array<object>}}
 */
function _getDayCloseContext() {
  const { todayStoreDate } = timeService.getNowInStoreTime();
  const shiftsForDate = shiftRepo.getAllShifts({ date: todayStoreDate });
  return { todayStoreDate, shiftsForDate };
}

/**
 * Retrieves the data needed for a day-close review screen.
 * Fetches all shifts for the current business date and all orders within each shift.
 * @returns {Promise<object>}
 */
export async function getReviewDataForDayClose() {
  const { todayStoreDate, shiftsForDate } = _getDayCloseContext();
  logger.info(`Fetching day close review data for date: ${todayStoreDate}`);

  // Use the serializer to add staff data to the shifts
  const serializedShifts = serializeManyShifts(shiftsForDate);

  const shiftsWithOrders = serializedShifts.map(shift => {
    const orders = orderRepo.getAllOrders({ shift_id: shift.id });
    return { ...shift, orders };
  });

  return {
    businessDate: todayStoreDate,
    shifts: shiftsWithOrders,
  };
}


/**
 * Generates a day-close report by aggregating data from two closed shifts
 * for the current business date, and sends a Telegram notification.
 * @returns {Promise<object>} The generated day close report.
 */
export async function generateDayCloseReport() {
  const { todayStoreDate, shiftsForDate } = _getDayCloseContext();
  logger.info(`Day close report process started for date: ${todayStoreDate}`);

  const closedShifts = shiftsForDate.filter(s => s.status === 'closed');

  const shiftReports = closedShifts.map(shift => shiftRepo.getShiftSalesReport(shift.id));

  // Combine the two reports
  const combined = {
    totalOrders: 0,
    totalRevenue: 0,
    totalItems: 0,
    revenueByPaymentType: {},
    grandTotalItems: 0,
    voidedOrders: 0,
    voidedAmount: 0,
    voidedItems: 0,
    netRevenue: 0,
  };

  for (const report of shiftReports) {
    combined.totalOrders += report.totalOrders;
    combined.totalRevenue += report.totalRevenue;
    combined.totalItems += report.totalItems;
    combined.voidedOrders += report.voidedOrders || 0;
    combined.voidedAmount += report.voidedAmount || 0;
    combined.voidedItems += report.voidedItems || 0;
    combined.netRevenue += report.netRevenue ?? report.totalRevenue;
    for (const [type, amount] of Object.entries(report.revenueByPaymentType)) {
      if (!combined.revenueByPaymentType[type]) {
        combined.revenueByPaymentType[type] = 0;
      }
      combined.revenueByPaymentType[type] += amount;
    }
    combined.grandTotalItems += report.totalItems;
  }

  const finalReport = {
    businessDate: todayStoreDate,
    shiftSummaries: shiftReports,
    combinedSummary: combined,
  };
  
  logger.info('Day close report generated successfully.', { date: todayStoreDate, totalRevenue: combined.totalRevenue });

  // Send Telegram notification
  try {
    logger.info('Attempting to send day close report to Telegram...');
    const message = formatDayCloseMessage(finalReport);
    await sendTelegramEvent('SHIFT_TRACKER', message);
    logger.info('Telegram day close report sent successfully or was skipped due to settings.');
  } catch (error) {
    // Log the error but don't let it fail the API request.
    // The Telegram service already logs API errors, so we just log the context here.
    logger.error('Failed to send day close Telegram report.', { error: error.message });
  }

  return finalReport;
}
