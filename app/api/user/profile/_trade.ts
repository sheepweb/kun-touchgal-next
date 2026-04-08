export const USER_TRADE_ACCESS_STATUS_CASE_SQL = `CASE
  WHEN prp.access_expires_at IS NOT NULL AND prp.access_expires_at <= NOW() THEN 'expired'
  WHEN prp.access_expire_mode = 'first_download' AND prp.access_started_at IS NULL THEN 'not_started'
  ELSE 'owned'
END`

export const buildTradeContentLimitSql = (
  nsfwEnable: Record<string, string | undefined>,
  params: unknown[],
  patchAlias = 'p'
) => {
  if (!nsfwEnable.content_limit) {
    return ''
  }

  params.push(nsfwEnable.content_limit)
  return ` AND ${patchAlias}.content_limit = $${params.length}`
}
