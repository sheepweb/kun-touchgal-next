import { DEFAULT_TRADE_CURRENCY_CODE } from '~/constants/currency'
import { prisma } from '~/prisma/index'
import type {
  PatchResourceAccessExpireMode,
  PatchResourceAccessStatus,
  PatchResourceSaleInfo
} from '~/types/api/patch'

type RawSqlClient = Pick<typeof prisma, '$queryRawUnsafe' | '$executeRawUnsafe'>

export interface PatchResourceSaleRow {
  resource_id: number
  seller_id: number
  currency_code: string
  price: number
  enabled: boolean
  access_expire_mode: PatchResourceAccessExpireMode
  access_duration_days: number | null
}

export interface PatchResourcePurchaseRow {
  id: number
  resource_id: number
  buyer_id: number
  seller_id: number
  currency_code: string
  price: number
  status: string
  access_expire_mode: PatchResourceAccessExpireMode
  access_duration_days: number | null
  access_started_at: Date | string | null
  access_expires_at: Date | string | null
  first_download_at: Date | string | null
  last_download_at: Date | string | null
  created: Date | string
}

export interface ResolvedPatchResourceAccess {
  sale: PatchResourceSaleInfo | null
  isPaid: boolean
  hasPurchased: boolean
  requiresLogin: boolean
  canDownload: boolean
  accessStatus: PatchResourceAccessStatus
  accessStartedAt: string | null
  accessExpiresAt: string | null
  accessDurationDays: number | null
}

const getSqlNumberList = (ids: number[]) =>
  [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].join(', ')

export const toIsoString = (value?: Date | string | null) =>
  value ? new Date(value).toISOString() : null

export const getPatchResourceSales = async (
  resourceIds: number[],
  client: RawSqlClient = prisma
) => {
  const ids = getSqlNumberList(resourceIds)
  if (!ids) {
    return [] as PatchResourceSaleRow[]
  }

  return client.$queryRawUnsafe<PatchResourceSaleRow[]>(
    `SELECT resource_id, seller_id, currency_code, price, enabled, access_expire_mode, access_duration_days
     FROM "patch_resource_sale"
     WHERE enabled = true AND resource_id IN (${ids})`
  )
}

export const getPatchResourcePurchases = async (
  uid: number,
  resourceIds: number[],
  client: RawSqlClient = prisma
) => {
  const ids = getSqlNumberList(resourceIds)
  if (!uid || !ids) {
    return [] as PatchResourcePurchaseRow[]
  }

  return client.$queryRawUnsafe<PatchResourcePurchaseRow[]>(
    `SELECT id, resource_id, buyer_id, seller_id, currency_code, price, status,
            access_expire_mode, access_duration_days, access_started_at,
            access_expires_at, first_download_at, last_download_at, created
     FROM "patch_resource_purchase"
     WHERE buyer_id = $1 AND status = 'paid' AND resource_id IN (${ids})`,
    uid
  )
}

export const toPatchResourceSaleInfo = (
  sale?: PatchResourceSaleRow | null
): PatchResourceSaleInfo | null => {
  if (!sale) {
    return null
  }

  return {
    currencyCode: sale.currency_code,
    price: sale.price,
    accessExpireMode: sale.access_expire_mode,
    accessDurationDays: sale.access_duration_days
  }
}

export const resolvePatchResourceAccess = ({
  uid,
  role,
  ownerId,
  sale,
  purchase,
  now = new Date()
}: {
  uid: number
  role: number
  ownerId: number
  sale?: PatchResourceSaleRow | null
  purchase?: PatchResourcePurchaseRow | null
  now?: Date
}): ResolvedPatchResourceAccess => {
  const saleInfo = toPatchResourceSaleInfo(sale)
  const purchaseSaleInfo = purchase
    ? {
        currencyCode: purchase.currency_code,
        price: purchase.price,
        accessExpireMode: purchase.access_expire_mode,
        accessDurationDays: purchase.access_duration_days
      }
    : null
  const effectiveSaleInfo = saleInfo ?? purchaseSaleInfo
  const isPaid = !!effectiveSaleInfo
  const isOwner = uid > 0 && (ownerId === uid || role >= 3)

  if (isOwner) {
    return {
      sale: effectiveSaleInfo,
      isPaid,
      hasPurchased: false,
      requiresLogin: false,
      canDownload: true,
      accessStatus: 'owner' as PatchResourceAccessStatus,
      accessStartedAt: null,
      accessExpiresAt: null,
      accessDurationDays: effectiveSaleInfo?.accessDurationDays ?? null
    }
  }

  if (!effectiveSaleInfo) {
    return {
      sale: null,
      isPaid: false,
      hasPurchased: false,
      requiresLogin: uid === 0,
      canDownload: uid > 0,
      accessStatus:
        uid > 0
          ? ('free' as PatchResourceAccessStatus)
          : ('guest' as PatchResourceAccessStatus),
      accessStartedAt: null,
      accessExpiresAt: null,
      accessDurationDays: null
    }
  }

  if (uid === 0) {
    return {
      sale: effectiveSaleInfo,
      isPaid: true,
      hasPurchased: false,
      requiresLogin: true,
      canDownload: false,
      accessStatus: 'guest' as PatchResourceAccessStatus,
      accessStartedAt: null,
      accessExpiresAt: null,
      accessDurationDays: effectiveSaleInfo.accessDurationDays
    }
  }

  if (!purchase) {
    return {
      sale: effectiveSaleInfo,
      isPaid: true,
      hasPurchased: false,
      requiresLogin: false,
      canDownload: false,
      accessStatus: 'not_purchased' as PatchResourceAccessStatus,
      accessStartedAt: null,
      accessExpiresAt: null,
      accessDurationDays: effectiveSaleInfo.accessDurationDays
    }
  }

  const accessExpiresAt = toIsoString(purchase.access_expires_at)
  if (
    purchase.access_expires_at &&
    new Date(purchase.access_expires_at).getTime() <= now.getTime()
  ) {
    return {
      sale: effectiveSaleInfo,
      isPaid: true,
      hasPurchased: true,
      requiresLogin: false,
      canDownload: false,
      accessStatus: 'expired' as PatchResourceAccessStatus,
      accessStartedAt: toIsoString(purchase.access_started_at),
      accessExpiresAt,
      accessDurationDays: purchase.access_duration_days
    }
  }

  if (
    purchase.access_expire_mode === 'first_download' &&
    !purchase.access_started_at
  ) {
    return {
      sale: effectiveSaleInfo,
      isPaid: true,
      hasPurchased: true,
      requiresLogin: false,
      canDownload: true,
      accessStatus: 'not_started' as PatchResourceAccessStatus,
      accessStartedAt: null,
      accessExpiresAt: null,
      accessDurationDays: purchase.access_duration_days
    }
  }

  return {
    sale: effectiveSaleInfo,
    isPaid: true,
    hasPurchased: true,
    requiresLogin: false,
    canDownload: true,
    accessStatus: 'owned' as PatchResourceAccessStatus,
    accessStartedAt: toIsoString(purchase.access_started_at),
    accessExpiresAt,
    accessDurationDays: purchase.access_duration_days
  }
}

export const getPurchaseAccessWindow = (
  accessExpireMode: PatchResourceAccessExpireMode,
  accessDurationDays: number | null,
  now: Date
) => {
  if (accessExpireMode === 'never') {
    return { accessStartedAt: now, accessExpiresAt: null }
  }

  if (accessExpireMode === 'purchase') {
    if (!accessDurationDays) {
      return null
    }

    return {
      accessStartedAt: now,
      accessExpiresAt: new Date(now.getTime() + accessDurationDays * 86400000)
    }
  }

  return { accessStartedAt: null, accessExpiresAt: null }
}

export const syncPatchResourceSale = async (
  client: RawSqlClient,
  input: {
    resourceId: number
    sellerId: number
    enableSale: boolean
    saleCurrencyCode?: string
    salePrice?: number
    saleAccessExpireMode?: string
    saleAccessDurationDays?: number | null
  }
) => {
  if (!input.enableSale) {
    await client.$executeRawUnsafe(
      `UPDATE "patch_resource_sale" SET enabled = false, updated = NOW() WHERE resource_id = $1`,
      input.resourceId
    )
    return null
  }

  const accessExpireMode =
    (input.saleAccessExpireMode as PatchResourceAccessExpireMode) ?? 'never'
  const accessDurationDays =
    accessExpireMode === 'never' ? null : (input.saleAccessDurationDays ?? null)
  const saleInfo = {
    currencyCode: input.saleCurrencyCode ?? DEFAULT_TRADE_CURRENCY_CODE,
    price: input.salePrice ?? 0,
    accessExpireMode,
    accessDurationDays
  }

  await client.$executeRawUnsafe(
    `INSERT INTO "patch_resource_sale"
      (resource_id, seller_id, currency_code, price, enabled, access_expire_mode, access_duration_days, created, updated)
     VALUES ($1, $2, $3, $4, true, $5, $6, NOW(), NOW())
     ON CONFLICT (resource_id)
     DO UPDATE SET
      seller_id = EXCLUDED.seller_id,
      currency_code = EXCLUDED.currency_code,
      price = EXCLUDED.price,
      enabled = EXCLUDED.enabled,
      access_expire_mode = EXCLUDED.access_expire_mode,
      access_duration_days = EXCLUDED.access_duration_days,
      updated = NOW()`,
    input.resourceId,
    input.sellerId,
    saleInfo.currencyCode,
    saleInfo.price,
    saleInfo.accessExpireMode,
    saleInfo.accessDurationDays
  )

  return saleInfo
}
