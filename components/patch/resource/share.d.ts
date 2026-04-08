import type {
  Control,
  FieldErrors,
  UseFormSetValue,
  UseFormWatch
} from 'react-hook-form'
import type {
  PatchResourceAccessExpireMode,
  PatchResourceLink
} from '~/types/api/patch'

export interface PatchResourceLinkInput {
  id?: number
  storage: PatchResourceLink['storage']
  hash: PatchResourceLink['hash']
  content: PatchResourceLink['content']
  size: PatchResourceLink['size']
  code: PatchResourceLink['code']
  password: PatchResourceLink['password']
}

export interface PatchResourceFormData {
  type: string[]
  name: string
  section: string
  patchId: number
  note: string
  language: string[]
  platform: string[]
  links: PatchResourceLinkInput[]
  enableSale: boolean
  saleCurrencyCode: string
  salePrice: number
  saleAccessExpireMode: PatchResourceAccessExpireMode
  saleAccessDurationDays: number | null
}

export type PatchResourceFormOutput = PatchResourceFormData

export interface FileStatus {
  file: File
  progress: number
  error?: string
  hash?: string
  filetype?: string
}

export type ErrorType = FieldErrors<PatchResourceFormData>
export type ControlType = Control<PatchResourceFormData, any>
export type SetValueType = UseFormSetValue<PatchResourceFormData>
export type WatchType = UseFormWatch<PatchResourceFormData>
