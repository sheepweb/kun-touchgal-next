'use server'

import { z } from 'zod'
import { safeParseSchema } from '~/utils/actions/safeParseSchema'
import { adminTradePaginationSchema } from '~/validations/admin'
import { getAdminTrade } from '~/app/api/admin/trade/route'
import { getNSFWHeader } from '~/utils/actions/getNSFWHeader'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'

export const kunGetActions = async (
  params: z.infer<typeof adminTradePaginationSchema>
) => {
  const input = safeParseSchema(adminTradePaginationSchema, params)
  if (typeof input === 'string') {
    return input
  }

  const payload = await verifyHeaderCookie()
  if (!payload) {
    return '用户登陆失效'
  }
  if (payload.role < 3) {
    return '本页面仅管理员可访问'
  }

  const nsfwEnable = await getNSFWHeader()
  return getAdminTrade(input, nsfwEnable)
}
