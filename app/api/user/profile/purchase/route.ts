import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { getNSFWHeader } from '~/app/api/utils/getNSFWHeader'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { prisma } from '~/prisma/index'
import { getUserPurchaseInfoSchema } from '~/validations/user'
import { toIsoString } from '~/app/api/patch/resource/trade'
import type { UserPurchasedResource } from '~/types/api/user'
import {
  buildTradeContentLimitSql,
  USER_TRADE_ACCESS_STATUS_CASE_SQL
} from '../_trade'

interface RawPurchasedResourceRow {
  purchase_id: number
  resource_id: number
  resource_name: string
  patch_id: number
  patch_unique_id: string
  patch_name: string
  patch_banner: string
  storage: string
  price: number
  currency_code: string
  downloaded_at: Date | string | null
  access_started_at: Date | string | null
  access_expires_at: Date | string | null
  access_expire_mode: string
  access_duration_days: number | null
  access_status: string
  download_count: number
  purchased_at: Date | string
}

const buildTradeAccessStatusSql = (accessStatus: string, params: unknown[]) => {
  if (accessStatus === 'all') {
    return ''
  }

  params.push(accessStatus)
  return ` AND ${USER_TRADE_ACCESS_STATUS_CASE_SQL} = $${params.length}`
}

export const getUserPurchasedResource = async (
  input: z.infer<typeof getUserPurchaseInfoSchema>,
  nsfwEnable: Record<string, string | undefined>
) => {
  const { uid, page, limit, accessStatus } = input
  const offset = (page - 1) * limit
  const dataParams: unknown[] = [uid, limit, offset]
  const countParams: unknown[] = [uid]
  const dataContentLimitSql = buildTradeContentLimitSql(nsfwEnable, dataParams)
  const countContentLimitSql = buildTradeContentLimitSql(
    nsfwEnable,
    countParams
  )
  const dataAccessStatusSql = buildTradeAccessStatusSql(
    accessStatus,
    dataParams
  )
  const countAccessStatusSql = buildTradeAccessStatusSql(
    accessStatus,
    countParams
  )

  const [rows, totalRows] = await Promise.all([
    prisma.$queryRawUnsafe<RawPurchasedResourceRow[]>(
      `SELECT prp.id AS purchase_id,
              prp.resource_id,
              pr.name AS resource_name,
              p.id AS patch_id,
              p.unique_id AS patch_unique_id,
              p.name AS patch_name,
              p.banner AS patch_banner,
              pr.storage,
              prp.price,
              prp.currency_code,
              prp.last_download_at AS downloaded_at,
              prp.access_started_at,
              prp.access_expires_at,
              prp.access_expire_mode,
              prp.access_duration_days,
              ${USER_TRADE_ACCESS_STATUS_CASE_SQL} AS access_status,
              COUNT(prdl.id)::int AS download_count,
              prp.created AS purchased_at
       FROM "patch_resource_purchase" prp
       INNER JOIN "patch_resource" pr ON pr.id = prp.resource_id
       INNER JOIN "patch" p ON p.id = pr.patch_id
       LEFT JOIN "patch_resource_download_log" prdl
         ON prdl.resource_id = prp.resource_id
        AND prdl.buyer_id = prp.buyer_id
       WHERE prp.buyer_id = $1
         AND prp.status = 'paid'
         AND pr.status = 0${dataContentLimitSql}${dataAccessStatusSql}
       GROUP BY prp.id,
                prp.resource_id,
                pr.name,
                p.id,
                p.unique_id,
                p.name,
                p.banner,
                pr.storage,
                prp.price,
                prp.currency_code,
                prp.last_download_at,
                prp.access_started_at,
                prp.access_expires_at,
                prp.access_expire_mode,
                prp.access_duration_days,
                prp.created
       ORDER BY prp.created DESC
       LIMIT $2 OFFSET $3`,
      ...dataParams
    ),
    prisma.$queryRawUnsafe<Array<{ total: number }>>(
      `SELECT COUNT(*)::int AS total
       FROM "patch_resource_purchase" prp
       INNER JOIN "patch_resource" pr ON pr.id = prp.resource_id
       INNER JOIN "patch" p ON p.id = pr.patch_id
       WHERE prp.buyer_id = $1
         AND prp.status = 'paid'
         AND pr.status = 0${countContentLimitSql}${countAccessStatusSql}`,
      ...countParams
    )
  ])

  const resources: UserPurchasedResource[] = rows.map((row) => ({
    purchaseId: row.purchase_id,
    resourceId: row.resource_id,
    resourceName: row.resource_name,
    patchId: row.patch_id,
    patchUniqueId: row.patch_unique_id,
    patchName: row.patch_name,
    patchBanner: row.patch_banner,
    storage: row.storage,
    price: row.price,
    currencyCode: row.currency_code,
    accessExpireMode: row.access_expire_mode,
    accessDurationDays: row.access_duration_days,
    downloadedAt: toIsoString(row.downloaded_at),
    downloadCount: row.download_count,
    accessStartedAt: toIsoString(row.access_started_at),
    accessExpiresAt: toIsoString(row.access_expires_at),
    accessStatus: row.access_status as UserPurchasedResource['accessStatus'],
    canDownload: row.access_status !== 'expired',
    purchasedAt:
      toIsoString(row.purchased_at) ?? new Date(row.purchased_at).toISOString()
  }))

  return { resources, total: totalRows[0]?.total ?? 0 }
}

export async function GET(req: NextRequest) {
  const input = kunParseGetQuery(req, getUserPurchaseInfoSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }

  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户登陆失效')
  }
  if (payload.uid !== input.uid) {
    return NextResponse.json('仅能查看自己的已购资源')
  }

  const nsfwEnable = getNSFWHeader(req)
  const response = await getUserPurchasedResource(input, nsfwEnable)
  return NextResponse.json(response)
}
