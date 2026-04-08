export const DEFAULT_TRADE_CURRENCY_CODE = 'coin'

export const SUPPORTED_CURRENCY_CODE = [DEFAULT_TRADE_CURRENCY_CODE] as const

export const SUPPORTED_CURRENCY_CODE_MAP: Record<string, string> = {
  coin: '站内币'
}

export const CURRENCY_LEDGER_DIRECTION_MAP: Record<string, string> = {
  income: '收入',
  expense: '支出'
}

export const CURRENCY_BIZ_TYPE_MAP: Record<string, string> = {
  resource_purchase: '资源购买',
  resource_sale: '资源售卖'
}

export const RESOURCE_ACCESS_EXPIRE_MODE = [
  'never',
  'purchase',
  'first_download'
] as const

export const RESOURCE_ACCESS_EXPIRE_MODE_MAP: Record<string, string> = {
  never: '永久有效',
  purchase: '购买后开始计时',
  first_download: '首次下载后开始计时'
}

export const RESOURCE_ACCESS_STATUS_MAP: Record<string, string> = {
  guest: '登录后查看',
  free: '免费资源',
  owner: '作者可下载',
  owned: '已购可下载',
  not_purchased: '尚未购买',
  expired: '授权已失效',
  not_started: '已购未开始计时'
}

export const RESOURCE_ACCESS_STATUS_COLOR_MAP: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  guest: 'default',
  free: 'success',
  owner: 'success',
  owned: 'success',
  not_purchased: 'warning',
  expired: 'danger',
  not_started: 'secondary'
}