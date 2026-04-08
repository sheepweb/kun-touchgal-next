import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { getNSFWHeader } from '~/app/api/utils/getNSFWHeader'
import {
  resolvePatchResourceAccess,
  toIsoString,
  type PatchResourcePurchaseRow
} from '~/app/api/patch/resource/trade'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { prisma } from '~/prisma/index'
import { adminTradePaginationSchema } from '~/validations/admin'
import type {
  AdminTradeDownloadLog,
  AdminTradePurchase
} from '~/types/api/admin'

const buildTradeSearchConditions = (search?: string) => {
  const keyword = search?.trim()
  if (!keyword) {
    return [] as any[]
  }

  const conditions: any[] = [
    { resource: { name: { contains: keyword, mode: 'insensitive' as const } } },
    {
      resource: {
        patch: {
          name: { contains: keyword, mode: 'insensitive' as const }
        }
      }
    },
    {
      resource: {
        patch: {
          unique_id: { contains: keyword, mode: 'insensitive' as const }
        }
      }
    },
    { buyer: { name: { contains: keyword, mode: 'insensitive' as const } } },
    { seller: { name: { contains: keyword, mode: 'insensitive' as const } } }
  ]

  const numericKeyword = Number(keyword)
  if (Number.isInteger(numericKeyword) && numericKeyword > 0) {
    conditions.push(
      { resource_id: numericKeyword },
      { buyer_id: numericKeyword },
      { seller_id: numericKeyword }
    )
  }

  return conditions
}

const tradeUserSelect = {
  id: true,
  name: true,
  avatar: true
} as const

const tradeResourceSelect = {
  id: true,
  name: true,
  storage: true,
  patch: {
    select: {
      id: true,
      unique_id: true,
      name: true
    }
  }
} as const

export const getAdminTrade = async (
  input: z.infer<typeof adminTradePaginationSchema>,
  nsfwEnable: Record<string, string | undefined>
) => {
  const { page, limit, tab, search } = input
  const offset = (page - 1) * limit
  const searchConditions = buildTradeSearchConditions(search)

  if (tab === 'download') {
    const where: any = {
      resource: { status: 0, patch: nsfwEnable }
    }
    if (searchConditions.length) {
      where.OR = searchConditions
    }

    const [data, total] = await Promise.all([
      prisma.patch_resource_download_log.findMany({
        where,
        include: {
          resource: { select: tradeResourceSelect },
          buyer: { select: tradeUserSelect },
          seller: { select: tradeUserSelect }
        },
        orderBy: { created: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.patch_resource_download_log.count({ where })
    ])

    const trades: AdminTradeDownloadLog[] = data.map((log) => ({
      id: log.id,
      resourceId: log.resource_id,
      resourceName: log.resource.name,
      patchId: log.resource.patch.id,
      patchUniqueId: log.resource.patch.unique_id,
      patchName: log.resource.patch.name,
      storage: log.storage,
      accessStatus: log.access_status as AdminTradeDownloadLog['accessStatus'],
      accessStartedAt: toIsoString(log.access_started_at),
      accessExpiresAt: toIsoString(log.access_expires_at),
      downloadedAt:
        toIsoString(log.created) ?? new Date(log.created).toISOString(),
      buyer: log.buyer,
      seller: log.seller
    }))

    return { trades, total }
  }

  const where: any = {
    status: 'paid',
    resource: { status: 0, patch: nsfwEnable }
  }
  if (searchConditions.length) {
    where.OR = searchConditions
  }

  const [data, total] = await Promise.all([
    prisma.patch_resource_purchase.findMany({
      where,
      include: {
        resource: { select: tradeResourceSelect },
        buyer: { select: tradeUserSelect },
        seller: { select: tradeUserSelect }
      },
      orderBy: { created: 'desc' },
      skip: offset,
      take: limit
    }),
    prisma.patch_resource_purchase.count({ where })
  ])

  const trades: AdminTradePurchase[] = data.map((purchase) => {
    const access = resolvePatchResourceAccess({
      uid: purchase.buyer_id,
      role: 1,
      ownerId: purchase.seller_id,
      purchase: {
        id: purchase.id,
        resource_id: purchase.resource_id,
        buyer_id: purchase.buyer_id,
        seller_id: purchase.seller_id,
        currency_code: purchase.currency_code,
        price: purchase.price,
        status: purchase.status,
        access_expire_mode:
          purchase.access_expire_mode as PatchResourcePurchaseRow['access_expire_mode'],
        access_duration_days: purchase.access_duration_days,
        access_started_at: purchase.access_started_at,
        access_expires_at: purchase.access_expires_at,
        first_download_at: purchase.first_download_at,
        last_download_at: purchase.last_download_at,
        created: purchase.created
      }
    })

    return {
      id: purchase.id,
      resourceId: purchase.resource_id,
      resourceName: purchase.resource.name,
      patchId: purchase.resource.patch.id,
      patchUniqueId: purchase.resource.patch.unique_id,
      patchName: purchase.resource.patch.name,
      storage: purchase.resource.storage,
      price: purchase.price,
      currencyCode: purchase.currency_code,
      accessExpireMode: purchase.access_expire_mode,
      accessDurationDays: purchase.access_duration_days,
      accessStatus: access.accessStatus,
      accessStartedAt: toIsoString(purchase.access_started_at),
      accessExpiresAt: toIsoString(purchase.access_expires_at),
      firstDownloadAt: toIsoString(purchase.first_download_at),
      lastDownloadAt: toIsoString(purchase.last_download_at),
      purchasedAt:
        toIsoString(purchase.created) ??
        new Date(purchase.created).toISOString(),
      buyer: purchase.buyer,
      seller: purchase.seller
    }
  })

  return { trades, total }
}

export const GET = async (req: NextRequest) => {
  const input = kunParseGetQuery(req, adminTradePaginationSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }

  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }
  if (payload.role < 3) {
    return NextResponse.json('本页面仅管理员可访问')
  }

  const nsfwEnable = getNSFWHeader(req)
  const response = await getAdminTrade(input, nsfwEnable)
  return NextResponse.json(response)
}
