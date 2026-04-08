import { z } from 'zod'
import {
  CURRENCY_BIZ_TYPE_MAP,
  DEFAULT_TRADE_CURRENCY_CODE
} from '~/constants/currency'
import { prisma } from '~/prisma/index'
import { purchasePatchResourceSchema } from '~/validations/patch'
import {
  getPatchResourcePurchases,
  getPatchResourceSales,
  getPurchaseAccessWindow,
  resolvePatchResourceAccess
} from './trade'
import type { PatchResourcePurchaseResult } from '~/types/api/patch'

interface CurrencyRow {
  code: string
  enabled: boolean
  allow_trade: boolean
}

interface BalanceRow {
  balance: number
}

export const purchasePatchResource = async (
  input: z.infer<typeof purchasePatchResourceSchema>,
  uid: number,
  role: number
) => {
  const resource = await prisma.patch_resource.findFirst({
    where: { id: input.resourceId, status: 0 },
    select: {
      id: true,
      user_id: true
    }
  })
  if (!resource) {
    return '未找到该资源'
  }
  if (resource.user_id === uid) {
    return '您不能购买自己发布的资源'
  }

  const [sale] = await getPatchResourceSales([resource.id])
  if (!sale) {
    return '该资源暂未开放购买'
  }

  const [currency] = await prisma.$queryRawUnsafe<CurrencyRow[]>(
    `SELECT code, enabled, allow_trade
     FROM "currency_definition"
     WHERE code = $1
     LIMIT 1`,
    sale.currency_code || DEFAULT_TRADE_CURRENCY_CODE
  )
  if (!currency?.enabled || !currency.allow_trade) {
    return '该交易币种不可用'
  }

  const [existingPurchase] = await getPatchResourcePurchases(uid, [resource.id])
  if (existingPurchase) {
    const existingAccess = resolvePatchResourceAccess({
      uid,
      role: 1,
      ownerId: resource.user_id,
      sale,
      purchase: existingPurchase
    })
    if (existingAccess.accessStatus !== 'expired') {
      return '您已购买过该资源'
    }
  }

  const [buyerBalance] = await prisma.$queryRawUnsafe<BalanceRow[]>(
    `SELECT balance
     FROM "user_currency_balance"
     WHERE user_id = $1 AND currency_code = $2
     LIMIT 1`,
    uid,
    sale.currency_code
  )
  if (!buyerBalance || buyerBalance.balance < sale.price) {
    return '您的余额不足'
  }

  const now = new Date()
  const accessWindow = getPurchaseAccessWindow(
    sale.access_expire_mode,
    sale.access_duration_days,
    now
  )
  if (!accessWindow) {
    return '资源授权配置无效'
  }

  return prisma.$transaction(async (tx) => {
    const [txSale] = await getPatchResourceSales([resource.id], tx)
    if (!txSale) {
      return '该资源暂未开放购买'
    }

    const [txPurchase] = await getPatchResourcePurchases(uid, [resource.id], tx)
    let purchaseAction: PatchResourcePurchaseResult['purchaseAction'] =
      'purchased'
    if (txPurchase) {
      const txAccess = resolvePatchResourceAccess({
        uid,
        role: 1,
        ownerId: resource.user_id,
        sale: txSale,
        purchase: txPurchase
      })
      if (txAccess.accessStatus !== 'expired') {
        return '您已购买过该资源'
      }
      purchaseAction = 'renewed'
    }

    const buyerUpdate = await tx.$queryRawUnsafe<BalanceRow[]>(
      `UPDATE "user_currency_balance"
       SET balance = balance - $3,
           total_spent = total_spent + $3,
           updated = NOW()
       WHERE user_id = $1 AND currency_code = $2 AND balance >= $3
       RETURNING balance`,
      uid,
      txSale.currency_code,
      txSale.price
    )
    if (!buyerUpdate[0]) {
      return '您的余额不足'
    }

    const sellerUpdate = await tx.$queryRawUnsafe<BalanceRow[]>(
      `INSERT INTO "user_currency_balance"
        (user_id, currency_code, balance, total_earned, total_spent, created, updated)
       VALUES ($1, $2, $3, $3, 0, NOW(), NOW())
       ON CONFLICT (user_id, currency_code)
       DO UPDATE SET
        balance = "user_currency_balance".balance + EXCLUDED.balance,
        total_earned = "user_currency_balance".total_earned + EXCLUDED.total_earned,
        updated = NOW()
       RETURNING balance`,
      resource.user_id,
      txSale.currency_code,
      txSale.price
    )

    await tx.$executeRawUnsafe(
      `INSERT INTO "currency_ledger"
        (user_id, currency_code, direction, amount, balance_after, biz_type, biz_id, counterparty_user_id, remark, created, updated)
       VALUES ($1, $2, 'expense', $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      uid,
      txSale.currency_code,
      txSale.price,
      buyerUpdate[0].balance,
      'resource_purchase',
      String(resource.id),
      resource.user_id,
      `${CURRENCY_BIZ_TYPE_MAP.resource_purchase}: ${resource.id}`
    )

    await tx.$executeRawUnsafe(
      `INSERT INTO "currency_ledger"
        (user_id, currency_code, direction, amount, balance_after, biz_type, biz_id, counterparty_user_id, remark, created, updated)
       VALUES ($1, $2, 'income', $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      resource.user_id,
      txSale.currency_code,
      txSale.price,
      sellerUpdate[0].balance,
      'resource_sale',
      String(resource.id),
      uid,
      `${CURRENCY_BIZ_TYPE_MAP.resource_sale}: ${resource.id}`
    )

    const purchaseRows = txPurchase
      ? await tx.$queryRawUnsafe<any[]>(
          `UPDATE "patch_resource_purchase"
         SET seller_id = $2,
             currency_code = $3,
             price = $4,
             status = 'paid',
             access_expire_mode = $5,
             access_duration_days = $6,
             access_started_at = $7,
             access_expires_at = $8,
             first_download_at = NULL,
             last_download_at = NULL,
             updated = NOW()
         WHERE id = $1
         RETURNING id, resource_id, buyer_id, seller_id, currency_code, price, status,
                   access_expire_mode, access_duration_days, access_started_at,
                   access_expires_at, first_download_at, last_download_at, created`,
          txPurchase.id,
          resource.user_id,
          txSale.currency_code,
          txSale.price,
          txSale.access_expire_mode,
          txSale.access_duration_days,
          accessWindow.accessStartedAt,
          accessWindow.accessExpiresAt
        )
      : await tx.$queryRawUnsafe<any[]>(
          `INSERT INTO "patch_resource_purchase"
          (resource_id, buyer_id, seller_id, currency_code, price, status, access_expire_mode, access_duration_days, access_started_at, access_expires_at, created, updated)
         VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $8, $9, NOW(), NOW())
         RETURNING id, resource_id, buyer_id, seller_id, currency_code, price, status,
                   access_expire_mode, access_duration_days, access_started_at,
                   access_expires_at, first_download_at, last_download_at, created`,
          resource.id,
          uid,
          resource.user_id,
          txSale.currency_code,
          txSale.price,
          txSale.access_expire_mode,
          txSale.access_duration_days,
          accessWindow.accessStartedAt,
          accessWindow.accessExpiresAt
        )

    const currentPurchase = purchaseRows[0]
    if (!currentPurchase) {
      return '资源购买记录写入失败，请重试'
    }

    const access = resolvePatchResourceAccess({
      uid,
      role,
      ownerId: resource.user_id,
      sale: txSale,
      purchase: currentPurchase
    })

    const response: PatchResourcePurchaseResult = {
      resourceId: resource.id,
      purchaseAction,
      hasPurchased: access.hasPurchased,
      canDownload: access.canDownload,
      accessStatus: access.accessStatus,
      accessStartedAt: access.accessStartedAt,
      accessExpiresAt: access.accessExpiresAt,
      accessDurationDays: access.accessDurationDays,
      sale: access.sale
    }

    return response
  })
}
