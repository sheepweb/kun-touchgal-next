import type { PatchResource } from '~/types/api/patch'
import type { PatchComment } from '~/types/api/comment'
import type { Message } from '~/types/api/message'
import type { PatchResourceAccessStatus } from '~/types/api/patch'

export type AdminStatsName =
  | 'user'
  | 'active'
  | 'patch'
  | 'patch_resource'
  | 'patch_comment'

export interface SumData {
  userCount: number
  galgameCount: number
  galgameResourceCount: number
  galgamePatchResourceCount: number
  galgameCommentCount: number
}

export interface OverviewData {
  newUser: number
  newActiveUser: number
  newGalgame: number
  newGalgameResource: number
  newComment: number
}

export interface AdminUser {
  id: number
  name: string
  email: string
  enable2FA: boolean
  bio: string
  avatar: string
  role: number
  status: number
  dailyImageCount: number
  created: Date | string
  _count: {
    patch: number
    patch_resource: number
  }
}

export interface AdminCreator {
  id: number
  content: string
  status: number
  sender: KunUser | null
  patchResourceCount: number
  created: Date | string
}

export interface AdminGalgame {
  id: number
  uniqueId: string
  name: string
  banner: string
  user: KunUser
  created: Date | string
}

export interface AdminResource extends PatchResource {
  patchName: string
}

export type AdminComment = PatchComment

export type AdminFeedback = Message

export type AdminReportTargetType = 'comment' | 'rating'

export interface AdminReport extends Message {
  targetType: AdminReportTargetType
  reportedUserId?: number
  reportedCommentId?: number
  reportedRatingId?: number
  reportedUser: KunUser | null
}

export interface AdminLog {
  id: number
  type: string
  user: KunUser
  content: string
  created: Date | string
}

export interface AdminTradePurchase {
  id: number
  resourceId: number
  resourceName: string
  patchId: number
  patchUniqueId: string
  patchName: string
  storage: string
  price: number
  currencyCode: string
  accessExpireMode: string
  accessDurationDays: number | null
  accessStatus: PatchResourceAccessStatus
  accessStartedAt: string | null
  accessExpiresAt: string | null
  firstDownloadAt: string | null
  lastDownloadAt: string | null
  purchasedAt: string
  buyer: KunUser
  seller: KunUser
}

export interface AdminTradeDownloadLog {
  id: number
  resourceId: number
  resourceName: string
  patchId: number
  patchUniqueId: string
  patchName: string
  storage: string
  accessStatus: PatchResourceAccessStatus
  accessStartedAt: string | null
  accessExpiresAt: string | null
  downloadedAt: string
  buyer: KunUser
  seller: KunUser
}

export interface AdminRedirectConfig {
  enableRedirect: boolean
  excludedDomains: string[]
  delaySeconds: number
}
