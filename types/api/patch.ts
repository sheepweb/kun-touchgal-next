import { Tag } from './tag'
import { Company } from './company'

export interface Patch {
  id: number
  uniqueId: string
  vndbId: string | null
  vndbRelationId: string | null
  bangumiId: number | null
  steamId: number | null
  dlsiteCode: string | null
  name: string
  banner: string
  introduction: string
  status: number
  view: number
  download: number
  alias: string[]
  type: string[]
  language: string[]
  platform: string[]
  tags: string[]
  isFavorite: boolean
  contentLimit: string
  ratingSummary: PatchRatingSummary
  user: {
    id: number
    name: string
    avatar: string
  }
  created: string
  updated: string
  _count: {
    favorite_folder: number
    resource: number
    comment: number
  }
}

export interface PatchRatingSummary {
  average: number
  count: number
  histogram: { score: number; count: number }[]
  recommend: {
    strong_no: number
    no: number
    neutral: number
    yes: number
    strong_yes: number
  }
}

export interface PatchIntroduction {
  vndbId: string | null
  vndbRelationId?: string | null
  bangumiId?: number | null
  steamId?: number | null
  dlsiteCode?: string | null
  introduction: string
  released: string
  alias: string[]
  tag: Tag[]
  company: Company[]
  resourceUpdateTime: Date | string
  created: Date | string
  updated: Date | string
}

export interface PatchUpdate {
  name: string
  alias: string[]
  introduction: string
}

export interface PatchResourceLink {
  id: number
  storage: string
  size: string
  code: string
  password: string
  hash: string
  content: string
  sortOrder: number
  download: number
}

export type PatchResourceAccessExpireMode =
  | 'never'
  | 'purchase'
  | 'first_download'

export type PatchResourceAccessStatus =
  | 'guest'
  | 'free'
  | 'owner'
  | 'owned'
  | 'not_purchased'
  | 'expired'
  | 'not_started'

export interface PatchResourceSaleInfo {
  currencyCode: string
  price: number
  accessExpireMode: PatchResourceAccessExpireMode
  accessDurationDays: number | null
}

export interface PatchResourcePurchaseResult {
  resourceId: number
  purchaseAction: 'purchased' | 'renewed'
  hasPurchased: boolean
  canDownload: boolean
  accessStatus: PatchResourceAccessStatus
  accessStartedAt: string | null
  accessExpiresAt: string | null
  accessDurationDays: number | null
  sale: PatchResourceSaleInfo | null
}

export interface PatchResourceDownloadPayload {
  resourceId: number
  patchId: number
  storage: string
  content: string
  code: string
  password: string
  hash: string
  accessStatus: PatchResourceAccessStatus
  accessStartedAt: string | null
  accessExpiresAt: string | null
  accessDurationDays: number | null
}

export interface PatchResource {
  id: number
  name: string
  section: string
  uniqueId: string
  type: string[]
  language: string[]
  note: string
  platform: string[]
  links: PatchResourceLink[]
  likeCount: number
  isLike: boolean
  status: number
  userId: number
  patchId: number
  created: string
  sale: PatchResourceSaleInfo | null
  isPaid: boolean
  hasPurchased: boolean
  requiresLogin: boolean
  canDownload: boolean
  accessStatus: PatchResourceAccessStatus
  accessStartedAt: string | null
  accessExpiresAt: string | null
  accessDurationDays: number | null
  user: KunUser & {
    patchCount: number
    role: number
  }
}

export interface PatchComment {
  id: number
  uniqueId: string
  content: string
  isLike: boolean
  likeCount: number
  parentId: number | null
  userId: number
  patchId: number
  created: string
  updated: string
  reply: PatchComment[]
  user: KunUser
  quotedContent?: string | null
  quotedUsername?: string | null
  replyToUser?: KunUser | null
}

export interface PatchCommentResponse {
  comments: PatchComment[]
  total: number
  currentPage: number
}
