import { z } from 'zod'
import { prisma } from '~/prisma/index'
import {
  getPatchResourcePurchases,
  getPatchResourceSales,
  resolvePatchResourceAccess
} from './trade'
import type { PatchResource } from '~/types/api/patch'

const patchIdSchema = z.object({
  patchId: z.coerce.number().min(1).max(9999999)
})

export const getPatchResource = async (
  input: z.infer<typeof patchIdSchema>,
  uid: number,
  role: number
) => {
  const { patchId } = input

  const data = await prisma.patch_resource.findMany({
    where: {
      patch_id: patchId,
      status: 0
    },
    include: {
      patch: { select: { unique_id: true } },
      user: {
        include: {
          _count: {
            select: { patch_resource: true }
          }
        }
      },
      links: {
        orderBy: { sort_order: 'asc' }
      },
      _count: {
        select: { like_by: true }
      },
      like_by: {
        where: {
          user_id: uid
        }
      }
    }
  })

  const resourceIds = data.map((resource) => resource.id)
  const [sales, purchases] = await Promise.all([
    getPatchResourceSales(resourceIds),
    getPatchResourcePurchases(uid, resourceIds)
  ])

  const salesMap = new Map(sales.map((sale) => [sale.resource_id, sale]))
  const purchasesMap = new Map(
    purchases.map((purchase) => [purchase.resource_id, purchase])
  )

  const resources: PatchResource[] = data.map((resource) => {
    const access = resolvePatchResourceAccess({
      uid,
      role,
      ownerId: resource.user_id,
      sale: salesMap.get(resource.id),
      purchase: purchasesMap.get(resource.id)
    })

    return {
      id: resource.id,
      name: resource.name,
      section: resource.section,
      uniqueId: resource.patch.unique_id,
      type: resource.type,
      language: resource.language,
      note: resource.note,
      platform: resource.platform,
      links: resource.links.map((link) => ({
        id: link.id,
        storage: link.storage,
        size: link.size,
        code: access.canDownload ? link.code : '',
        password: access.canDownload ? link.password : '',
        hash: access.canDownload ? link.hash : '',
        content: access.canDownload ? link.content : '',
        sortOrder: link.sort_order,
        download: link.download
      })),
      likeCount: resource._count.like_by,
      isLike: resource.like_by.length > 0,
      status: resource.status,
      userId: resource.user_id,
      patchId: resource.patch_id,
      created: String(resource.created),
      sale: access.sale,
      isPaid: access.isPaid,
      hasPurchased: access.hasPurchased,
      requiresLogin: access.requiresLogin,
      canDownload: access.canDownload,
      accessStatus: access.accessStatus,
      accessStartedAt: access.accessStartedAt,
      accessExpiresAt: access.accessExpiresAt,
      accessDurationDays: access.accessDurationDays,
      user: {
        id: resource.user.id,
        name: resource.user.name,
        avatar: resource.user.avatar,
        patchCount: resource.user._count.patch_resource,
        role: resource.user.role
      }
    }
  })

  return resources
}
