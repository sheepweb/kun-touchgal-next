import type { Prisma } from '~/prisma/generated/prisma/client'
import type { AdminResource } from '~/types/api/admin'
import type { PatchResourceAccessExpireMode } from '~/types/api/patch'

export const adminResourceInclude = {
  patch: {
    select: {
      name: true,
      unique_id: true
    }
  },
  sale: true,
  user: {
    select: {
      id: true,
      name: true,
      avatar: true,
      role: true,
      _count: {
        select: {
          patch_resource: true
        }
      }
    }
  },
  links: {
    orderBy: { sort_order: 'asc' }
  }
} as const satisfies Prisma.patch_resourceInclude

export type AdminResourceRow = Prisma.patch_resourceGetPayload<{
  include: typeof adminResourceInclude
}>

export const toAdminResource = (resource: AdminResourceRow): AdminResource => {
  const sale = resource.sale?.enabled
    ? {
        currencyCode: resource.sale.currency_code,
        price: resource.sale.price,
        accessExpireMode: resource.sale
          .access_expire_mode as PatchResourceAccessExpireMode,
        accessDurationDays: resource.sale.access_duration_days
      }
    : null

  return {
    id: resource.id,
    name: resource.name,
    section: resource.section,
    uniqueId: resource.patch.unique_id,
    patchName: resource.patch.name,
    type: resource.type,
    language: resource.language,
    note: resource.note,
    platform: resource.platform,
    links: resource.links.map((link) => ({
      id: link.id,
      storage: link.storage,
      size: link.size,
      code: link.code,
      password: link.password,
      hash: link.hash,
      content: link.content,
      sortOrder: link.sort_order,
      download: link.download
    })),
    likeCount: 0,
    isLike: false,
    status: resource.status,
    userId: resource.user_id,
    patchId: resource.patch_id,
    sale,
    isPaid: !!sale,
    hasPurchased: false,
    requiresLogin: false,
    canDownload: true,
    accessStatus: 'owner',
    accessStartedAt: null,
    accessExpiresAt: null,
    accessDurationDays: sale?.accessDurationDays ?? null,
    created: String(resource.created),
    user: {
      id: resource.user.id,
      name: resource.user.name,
      avatar: resource.user.avatar,
      role: resource.user.role,
      patchCount: resource.user._count.patch_resource
    }
  }
}
