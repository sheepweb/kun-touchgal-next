'use client'

import { useEffect, useRef, useState } from 'react'
import { KunLoading } from '~/components/kun/Loading'
import { KunNull } from '~/components/kun/Null'
import { KunPagination } from '~/components/kun/Pagination'
import { useMounted } from '~/hooks/useMounted'
import { kunFetchGet } from '~/utils/kunFetch'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import { UserDownloadCard } from './Card'
import type { UserResourceDownloadLog } from '~/types/api/user'

interface Props {
  initialLogs: UserResourceDownloadLog[]
  total: number
  uid: number
}

export const UserDownload = ({ initialLogs, total, uid }: Props) => {
  const isMounted = useMounted()
  const hasSkippedInitialFetch = useRef(false)
  const [logs, setLogs] = useState<UserResourceDownloadLog[]>(initialLogs)
  const [totalCount, setTotalCount] = useState(total)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLogs(initialLogs)
    setTotalCount(total)
    setPage(1)
    hasSkippedInitialFetch.current = false
  }, [initialLogs, total, uid])

  const fetchLogs = async (targetPage = page) => {
    setLoading(true)
    const res = await kunFetchGet<
      KunResponse<{ logs: UserResourceDownloadLog[]; total: number }>
    >('/user/profile/download', {
      uid,
      page: targetPage,
      limit: 20
    })
    setLoading(false)

    kunErrorHandler(res, (value) => {
      setLogs(value.logs)
      setTotalCount(value.total)
    })
  }

  useEffect(() => {
    if (!isMounted) {
      return
    }

    if (!hasSkippedInitialFetch.current) {
      hasSkippedInitialFetch.current = true
      return
    }

    fetchLogs()
  }, [isMounted, page])

  return (
    <div className="space-y-4">
      {loading ? (
        <KunLoading hint="正在获取下载记录数据..." />
      ) : logs.length ? (
        <>
          {logs.map((log) => (
            <UserDownloadCard key={log.id} log={log} />
          ))}
        </>
      ) : (
        <KunNull message="您还没有下载过任何资源哦" />
      )}

      {totalCount > 20 && (
        <div className="flex justify-center">
          <KunPagination
            total={Math.ceil(totalCount / 20)}
            page={page}
            onPageChange={setPage}
            isLoading={loading}
          />
        </div>
      )}
    </div>
  )
}
