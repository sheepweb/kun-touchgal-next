import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { adminResourceApplyPaginationSchema } from '~/validations/admin'
import { adminResourceInclude, toAdminResource } from '../resource/shared'

export const getPatchResourceApply = async (
  input: z.infer<typeof adminResourceApplyPaginationSchema>,
  nsfwEnable: Record<string, string | undefined>
) => {
  const { page, limit, search } = input
  const offset = (page - 1) * limit

  const whereBase = {
    patch: nsfwEnable,
    status: 2
  } as const

  const where = search
    ? {
        ...whereBase,
        links: {
          some: {
            OR: [
              {
                content: {
                  contains: search,
                  mode: 'insensitive' as const
                }
              },
              {
                hash: {
                  contains: search,
                  mode: 'insensitive' as const
                }
              }
            ]
          }
        }
      }
    : whereBase

  const [data, total] = await Promise.all([
    prisma.patch_resource.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { created: 'desc' },
      include: adminResourceInclude
    }),
    prisma.patch_resource.count({ where })
  ])

  const resources = data.map(toAdminResource)
  return { resources, total }
}
