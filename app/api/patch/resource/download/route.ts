import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParsePutBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { prisma } from '~/prisma/index'
import { accessPatchResourceDownloadSchema } from '~/validations/patch'
import {
  getPatchResourcePurchases,
  getPatchResourceSales,
  getPurchaseAccessWindow,
  resolvePatchResourceAccess,
  type PatchResourcePurchaseRow
} from '../trade'
import type {
  PatchResourceAccessStatus,
  PatchResourceDownloadPayload
} from '~/types/api/patch'

const getAccessDeniedMessage = (accessStatus: PatchResourceAccessStatus) => {
  switch (accessStatus) {
    case 'guest':
      return '用户未登录'
    case 'not_purchased':
      return '请先购买该资源'
    case 'expired':
      return '该资源授权已失效'
    default:
      return '您暂无权限下载该资源'
  }
}

const accessPatchResourceDownload = async (
  input: z.infer<typeof accessPatchResourceDownloadSchema>,
  uid: number,
  role: number
) => {
  const resource = await prisma.patch_resource.findFirst({
    where: {
      id: input.resourceId,
      patch_id: input.patchId,
      status: 0
    },
    select: {
      id: true,
      patch_id: true,
      user_id: true,
      links: {
        orderBy: { sort_order: 'asc' },
        select: {
          id: true,
          storage: true,
          content: true,
          code: true,
          password: true,
          hash: true
        }
      }
    }
  })
  if (!resource) {
    return '未找到该资源'
  }

  const targetLink = input.linkId
    ? resource.links.find((link) => link.id === input.linkId)
    : resource.links[0]
  if (!targetLink) {
    return '未找到该资源链接'
  }

  const [sale, purchase] = await Promise.all([
    getPatchResourceSales([resource.id]),
    getPatchResourcePurchases(uid, [resource.id])
  ])

  const access = resolvePatchResourceAccess({
    uid,
    role,
    ownerId: resource.user_id,
    sale: sale[0],
    purchase: purchase[0]
  })
  if (!access.canDownload) {
    return getAccessDeniedMessage(access.accessStatus)
  }

  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const [txSale, txPurchase] = await Promise.all([
      getPatchResourceSales([resource.id], tx).then((rows) => rows[0] ?? null),
      getPatchResourcePurchases(uid, [resource.id], tx).then(
        (rows) => rows[0] ?? null
      )
    ])

    let currentPurchase = txPurchase
    if (
      currentPurchase?.access_expire_mode === 'first_download' &&
      !currentPurchase.access_started_at
    ) {
      const accessWindow = getPurchaseAccessWindow(
        currentPurchase.access_expire_mode,
        currentPurchase.access_duration_days,
        now
      )
      if (!accessWindow) {
        return '资源授权配置无效'
      }

      const rows = await tx.$queryRawUnsafe<PatchResourcePurchaseRow[]>(
        `UPDATE "patch_resource_purchase"
         SET access_started_at = $2,
             access_expires_at = $3,
             first_download_at = $4,
             last_download_at = $4,
             updated = NOW()
         WHERE id = $1
         RETURNING id, resource_id, buyer_id, seller_id, currency_code, price, status,
                   access_expire_mode, access_duration_days, access_started_at,
                   access_expires_at, first_download_at, last_download_at, created`,
        currentPurchase.id,
        accessWindow.accessStartedAt,
        accessWindow.accessExpiresAt,
        now
      )
      currentPurchase = rows[0] ?? currentPurchase
    } else if (currentPurchase) {
      await tx.$executeRawUnsafe(
        `UPDATE "patch_resource_purchase"
         SET first_download_at = COALESCE(first_download_at, $2),
             last_download_at = $2,
             updated = NOW()
         WHERE id = $1`,
        currentPurchase.id,
        now
      )
    }

    await tx.patch.update({
      where: { id: input.patchId },
      data: { download: { increment: 1 } }
    })
    await tx.patch_resource.update({
      where: { id: input.resourceId },
      data: { download: { increment: 1 } }
    })

    if (input.linkId) {
      await tx.patch_resource_link.updateMany({
        where: { id: input.linkId, resource_id: input.resourceId },
        data: { download: { increment: 1 } }
      })
    }

    const currentAccess = resolvePatchResourceAccess({
      uid,
      role,
      ownerId: resource.user_id,
      sale: txSale,
      purchase: currentPurchase,
      now
    })

    if (uid > 0) {
      await tx.patch_resource_download_log.create({
        data: {
          resource_id: resource.id,
          buyer_id: uid,
          seller_id: resource.user_id,
          storage: targetLink.storage,
          access_status: currentAccess.accessStatus,
          access_started_at: currentAccess.accessStartedAt
            ? new Date(currentAccess.accessStartedAt)
            : null,
          access_expires_at: currentAccess.accessExpiresAt
            ? new Date(currentAccess.accessExpiresAt)
            : null
        }
      })
    }

    const response: PatchResourceDownloadPayload = {
      resourceId: resource.id,
      patchId: resource.patch_id,
      storage: targetLink.storage,
      content: targetLink.content,
      code: targetLink.code,
      password: targetLink.password,
      hash: targetLink.hash,
      accessStatus: currentAccess.accessStatus,
      accessStartedAt: currentAccess.accessStartedAt,
      accessExpiresAt: currentAccess.accessExpiresAt,
      accessDurationDays: currentAccess.accessDurationDays
    }

    return response
  })
}

export const PUT = async (req: NextRequest) => {
  const input = await kunParsePutBody(req, accessPatchResourceDownloadSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }

  const payload = await verifyHeaderCookie(req)
  const response = await accessPatchResourceDownload(
    input,
    payload?.uid ?? 0,
    payload?.role ?? 0
  )
  return NextResponse.json(response)
}
