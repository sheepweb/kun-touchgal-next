import { NextRequest, NextResponse } from 'next/server'
import { kunParsePostBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { purchasePatchResourceSchema } from '~/validations/patch'
import { purchasePatchResource } from '../purchase'

export const POST = async (req: NextRequest) => {
  const input = await kunParsePostBody(req, purchasePatchResourceSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }

  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }

  const response = await purchasePatchResource(input, payload.uid, payload.role)
  return NextResponse.json(response)
}
