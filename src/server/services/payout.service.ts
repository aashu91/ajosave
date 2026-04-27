import { query } from "@/lib/db";
import { sendUsdcPayment } from "@/lib/stellar";
import { invokeContractPayout } from "@/lib/soroban";
import { getCircleById, getMembersByCircle, updateCircleStatus } from "./circle.service";
import { withPayoutLock, PayoutLockError } from "./payout-lock";
import { sendPayoutNotification, sendCircleCompletedNotification } from "./notification.service";
import { usdcToFiat } from "@/lib/currency";
import type { Payout } from "@/types";
import { randomUUID } from "crypto";

export { PayoutLockError };

/**
 * Process a payout cycle for a circle.
 *
 * If the circle has a contractId, the Soroban contract is the source of truth:
 * it handles the token transfer and rotation internally.
 *
 * Falls back to direct Horizon payment for circles without a deployed contract.
 *
 * All payout records are persisted to PostgreSQL for horizontal scalability.
 */
export async function processCyclePayout(
  circleId: string,
  recipientStellarKey: string
): Promise<Payout> {
  return withPayoutLock(circleId, async () => {
    const circle = await getCircleById(circleId);
    if (!circle) throw new Error("Circle not found");
    if (circle.status !== "active") throw new Error("Circle is not active");

    const circleMembers = await getMembersByCircle(circleId);
    const totalPot = (
      parseFloat(circle.contributionUsdc) * circleMembers.length
    ).toFixed(7);

    let txHash: string;
    if (circle.contractId) {
      // Soroban path: contract handles transfer, backend only triggers payout()
      txHash = await invokeContractPayout(circle.contractId);
    } else {
      // Horizon fallback for circles without a deployed contract
      txHash = await sendUsdcPayment(recipientStellarKey, totalPot);
    }

    const payoutId = randomUUID();
    const recipientMemberId = circleMembers[circle.currentCycle - 1]?.id ?? "";
    const recipientUserId = circleMembers[circle.currentCycle - 1]?.userId ?? "";

    // Persist payout to PostgreSQL
    const { rows } = await query<Payout>(
      `INSERT INTO payouts (id, circle_id, recipient_member_id, cycle_number, amount_usdc, tx_hash, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, circle_id as "circleId", recipient_member_id as "recipientMemberId", 
                 cycle_number as "cycleNumber", amount_usdc as "amountUsdc", tx_hash as "txHash", paid_at as "paidAt"`,
      [payoutId, circleId, recipientMemberId, circle.currentCycle, totalPot, txHash]
    );

    const payout = rows[0];

    // Send payout notification to recipient
    const fiatAmount = usdcToFiat(totalPot, circle.contributionCurrency);
    await sendPayoutNotification(
      recipientUserId,
      circle.name,
      fiatAmount.toString(),
      circle.contributionCurrency,
      txHash
    ).catch((err) => console.error("[payout] Failed to send notification:", err));

    if (circle.currentCycle >= circleMembers.length) {
      await updateCircleStatus(circleId, "completed");
      
      // Send completion notifications to all members
      for (const member of circleMembers) {
        await sendCircleCompletedNotification(member.userId, circle.name).catch((err) =>
          console.error("[payout] Failed to send completion notification:", err)
        );
      }
    }

    return payout;
  }); // end withPayoutLock
}

/**
 * Retrieve all payouts for a specific circle from PostgreSQL.
 * @param circleId The circle ID to filter payouts by
 * @returns Array of payout records sorted by cycle number
 */
export async function getPayoutsByCircle(circleId: string): Promise<Payout[]> {
  const { rows } = await query<Payout>(
    `SELECT id, circle_id as "circleId", recipient_member_id as "recipientMemberId",
            cycle_number as "cycleNumber", amount_usdc as "amountUsdc", tx_hash as "txHash", paid_at as "paidAt"
     FROM payouts
     WHERE circle_id = $1
     ORDER BY cycle_number ASC`,
    [circleId]
  );
  return rows;
}
