'use server'

import { z } from 'zod'
import { getUserPurchaseInfoSchema } from '~/validations/user'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'
import { safeParseSchema } from '~/utils/actions/safeParseSchema'
import { getNSFWHeader } from '~/utils/actions/getNSFWHeader'
import { getUserPurchasedResource } from '~/app/api/user/profile/purchase/route'

export const kunGetActions = async (
  params: z.infer<typeof getUserPurchaseInfoSchema>
) => {
  const input = safeParseSchema(getUserPurchaseInfoSchema, params)
  if (typeof input === 'string') {
    return input
  }

  const payload = await verifyHeaderCookie()
  if (!payload) {
    return '用户登陆失效'
  }

  if (payload.uid !== input.uid) {
    return '仅能查看自己的已购资源'
  }

  const nsfwEnable = await getNSFWHeader()
  return getUserPurchasedResource(input, nsfwEnable)
}
