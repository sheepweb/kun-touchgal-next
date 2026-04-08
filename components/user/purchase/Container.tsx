'use client'

import { Button, Tab, Tabs } from '@heroui/react'
import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { KunLoading } from '~/components/kun/Loading'
import { KunNull } from '~/components/kun/Null'
import { KunPagination } from '~/components/kun/Pagination'
import { useMounted } from '~/hooks/useMounted'
import { kunFetchGet } from '~/utils/kunFetch'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import { UserPurchaseCard } from './Card'
import type {
  UserPurchaseAccessStatusFilter,
  UserPurchasedResource
} from '~/types/api/user'

interface Props {
  initialResources: UserPurchasedResource[]
  total: number
  uid: number
  initialAccessStatus: UserPurchaseAccessStatusFilter
}

const purchaseTabs: Array<{
  key: UserPurchaseAccessStatusFilter
  title: string
}> = [
  { key: 'all', title: '全部' },
  { key: 'owned', title: '可下载' },
  { key: 'not_started', title: '未开始计时' },
  { key: 'expired', title: '已过期' }
]

const getEmptyMessage = (accessStatus: UserPurchaseAccessStatusFilter) => {
  switch (accessStatus) {
    case 'owned':
      return '暂无仍可下载的已购资源哦'
    case 'not_started':
      return '暂无等待首次下载后开始计时的资源哦'
    case 'expired':
      return '暂无授权已失效的资源哦'
    default:
      return '您还没有购买过任何资源哦'
  }
}

export const UserPurchase = ({
  initialResources,
  total,
  uid,
  initialAccessStatus
}: Props) => {
  const isMounted = useMounted()
  const hasSkippedInitialFetch = useRef(false)
  const [resources, setResources] =
    useState<UserPurchasedResource[]>(initialResources)
  const [totalCount, setTotalCount] = useState(total)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [accessStatus, setAccessStatus] =
    useState<UserPurchaseAccessStatusFilter>(initialAccessStatus)

  useEffect(() => {
    setResources(initialResources)
    setTotalCount(total)
    setPage(1)
    setAccessStatus(initialAccessStatus)
    hasSkippedInitialFetch.current = false
  }, [initialAccessStatus, initialResources, total, uid])

  const fetchResources = async (
    targetPage = page,
    targetAccessStatus = accessStatus
  ) => {
    setLoading(true)
    const res = await kunFetchGet<
      KunResponse<{ resources: UserPurchasedResource[]; total: number }>
    >('/user/profile/purchase', {
      uid,
      page: targetPage,
      limit: 20,
      accessStatus: targetAccessStatus
    })
    setLoading(false)

    kunErrorHandler(res, (value) => {
      setResources(value.resources)
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

    fetchResources()
  }, [accessStatus, isMounted, page])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          selectedKey={accessStatus}
          onSelectionChange={(key) => {
            const nextStatus = key.toString() as UserPurchaseAccessStatusFilter
            if (nextStatus === accessStatus) {
              return
            }
            setAccessStatus(nextStatus)
            setPage(1)
          }}
        >
          {purchaseTabs.map((tab) => (
            <Tab key={tab.key} title={tab.title} />
          ))}
        </Tabs>

        <Button
          variant="flat"
          color="primary"
          startContent={<RefreshCw className="size-4" />}
          isLoading={loading}
          onPress={() => fetchResources()}
        >
          刷新
        </Button>
      </div>

      {loading ? (
        <KunLoading hint="正在获取已购资源数据..." />
      ) : resources.length ? (
        <>
          {resources.map((resource) => (
            <UserPurchaseCard
              key={resource.purchaseId}
              resource={resource}
              onUpdated={() => fetchResources()}
            />
          ))}
        </>
      ) : (
        <KunNull message={getEmptyMessage(accessStatus)} />
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
