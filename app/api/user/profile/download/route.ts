import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { getNSFWHeader } from '~/app/api/utils/getNSFWHeader'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { prisma } from '~/prisma/index'
import { getUserInfoSchema } from '~/validations/user'
import { toIsoString } from '~/app/api/patch/resource/trade'
import { buildTradeContentLimitSql } from '../_trade'
import type { UserResourceDownloadLog } from '~/types/api/user'

interface RawDownloadLogRow {
  id: number
  resource_id: number
  resource_name: string
  patch_id: number
  patch_unique_id: string
  patch_name: string
  patch_banner: string
  storage: string
  access_status: string
  access_started_at: Date | string | null
  access_expires_at: Date | string | null
  downloaded_at: Date | string
}

export const getUserResourceDownloadLogs = async (
  input: z.infer<typeof getUserInfoSchema>,
  nsfwEnable: Record<string, string | undefined>
) => {
  const { uid, page, limit } = input
  const offset = (page - 1) * limit
  const dataParams: unknown[] = [uid, limit, offset]
  const countParams: unknown[] = [uid]
  const dataContentLimitSql = buildTradeContentLimitSql(nsfwEnable, dataParams)
  const countContentLimitSql = buildTradeContentLimitSql(
    nsfwEnable,
    countParams
  )

  const [rows, totalRows] = await Promise.all([
    prisma.$queryRawUnsafe<RawDownloadLogRow[]>(
      `SELECT prdl.id,
              prdl.resource_id,
              pr.name AS resource_name,
              p.id AS patch_id,
              p.unique_id AS patch_unique_id,
              p.name AS patch_name,
              p.banner AS patch_banner,
              prdl.storage,
              prdl.access_status,
              prdl.access_started_at,
              prdl.access_expires_at,
              prdl.created AS downloaded_at
       FROM "patch_resource_download_log" prdl
       INNER JOIN "patch_resource" pr ON pr.id = prdl.resource_id
       INNER JOIN "patch" p ON p.id = pr.patch_id
       WHERE prdl.buyer_id = $1
         AND pr.status = 0${dataContentLimitSql}
       ORDER BY prdl.created DESC
       LIMIT $2 OFFSET $3`,
      ...dataParams
    ),
    prisma.$queryRawUnsafe<Array<{ total: number }>>(
      `SELECT COUNT(*)::int AS total
       FROM "patch_resource_download_log" prdl
       INNER JOIN "patch_resource" pr ON pr.id = prdl.resource_id
       INNER JOIN "patch" p ON p.id = pr.patch_id
       WHERE prdl.buyer_id = $1
         AND pr.status = 0${countContentLimitSql}`,
      ...countParams
    )
  ])

  const logs: UserResourceDownloadLog[] = rows.map((row) => ({
    id: row.id,
    resourceId: row.resource_id,
    resourceName: row.resource_name,
    patchId: row.patch_id,
    patchUniqueId: row.patch_unique_id,
    patchName: row.patch_name,
    patchBanner: row.patch_banner,
    storage: row.storage,
    accessStatus: row.access_status as UserResourceDownloadLog['accessStatus'],
    accessStartedAt: toIsoString(row.access_started_at),
    accessExpiresAt: toIsoString(row.access_expires_at),
    downloadedAt:
      toIsoString(row.downloaded_at) ??
      new Date(row.downloaded_at).toISOString()
  }))

  return { logs, total: totalRows[0]?.total ?? 0 }
}

export async function GET(req: NextRequest) {
  const input = kunParseGetQuery(req, getUserInfoSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }

  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户登陆失效')
  }
  if (payload.uid !== input.uid) {
    return NextResponse.json('仅能查看自己的下载记录')
  }

  const nsfwEnable = getNSFWHeader(req)
  const response = await getUserResourceDownloadLogs(input, nsfwEnable)
  return NextResponse.json(response)
}
