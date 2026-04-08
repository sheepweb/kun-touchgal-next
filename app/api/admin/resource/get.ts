import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { adminResourcePaginationSchema } from '~/validations/admin'
import { adminResourceInclude, toAdminResource } from './shared'

export const getPatchResource = async (
  input: z.infer<typeof adminResourcePaginationSchema>,
  nsfwEnable: Record<string, string | undefined>
) => {
  const { page, limit, search, userId } = input
  const offset = (page - 1) * limit

  const where = {
    ...(search
      ? {
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
      : {}),
    ...(userId ? { user_id: userId } : {}),
    patch: nsfwEnable
  }

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
