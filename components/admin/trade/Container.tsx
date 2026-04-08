'use client'

import {
  Chip,
  Input,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs
} from '@heroui/react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useDebounce } from 'use-debounce'
import { KunUser } from '~/components/kun/floating-card/KunUser'
import { KunLoading } from '~/components/kun/Loading'
import { KunNull } from '~/components/kun/Null'
import { KunPagination } from '~/components/kun/Pagination'
import {
  RESOURCE_ACCESS_EXPIRE_MODE_MAP,
  RESOURCE_ACCESS_STATUS_COLOR_MAP,
  RESOURCE_ACCESS_STATUS_MAP,
  SUPPORTED_CURRENCY_CODE_MAP
} from '~/constants/currency'
import { SUPPORTED_RESOURCE_LINK_MAP } from '~/constants/resource'
import { useMounted } from '~/hooks/useMounted'
import type {
  AdminTradeDownloadLog,
  AdminTradePurchase
} from '~/types/api/admin'
import { kunFetchGet } from '~/utils/kunFetch'
import { formatDate } from '~/utils/time'

type TradeTab = 'purchase' | 'download'
type TradeItem = AdminTradePurchase | AdminTradeDownloadLog

const columns: Record<TradeTab, Array<{ name: string; uid: string }>> = {
  purchase: [
    { name: '作品', uid: 'patch' },
    { name: '资源', uid: 'resource' },
    { name: '买家', uid: 'buyer' },
    { name: '卖家', uid: 'seller' },
    { name: '价格', uid: 'price' },
    { name: '授权', uid: 'access' },
    { name: '时间', uid: 'time' }
  ],
  download: [
    { name: '作品', uid: 'patch' },
    { name: '资源', uid: 'resource' },
    { name: '买家', uid: 'buyer' },
    { name: '卖家', uid: 'seller' },
    { name: '存储', uid: 'storage' },
    { name: '授权', uid: 'access' },
    { name: '时间', uid: 'time' }
  ]
}

interface Props {
  initialTrades: TradeItem[]
  initialTotal: number
  initialTab: TradeTab
}

const isPurchaseTrade = (trade: TradeItem): trade is AdminTradePurchase =>
  'price' in trade

const renderTradeUser = (user: KunUser, description?: string) => {
  return (
    <KunUser
      user={user}
      userProps={{
        name: user.name,
        description,
        avatarProps: {
          src: user.avatar
        }
      }}
    />
  )
}

const getEmptyMessage = (tab: TradeTab, search: string) => {
  if (search.trim()) {
    return '未找到匹配的交易记录'
  }

  return tab === 'purchase' ? '暂无资源购买记录' : '暂无资源下载记录'
}

export const Trade = ({ initialTrades, initialTotal, initialTab }: Props) => {
  const [trades, setTrades] = useState<TradeItem[]>(initialTrades)
  const [total, setTotal] = useState(initialTotal)
  const [activeTab, setActiveTab] = useState<TradeTab>(initialTab)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery] = useDebounce(searchQuery, 500)
  const isMounted = useMounted()
  const [loading, setLoading] = useState(false)

  const fetchData = async (
    targetPage = page,
    targetTab = activeTab,
    targetSearch = debouncedQuery
  ) => {
    setLoading(true)
    const response = await kunFetchGet<
      KunResponse<{ trades: TradeItem[]; total: number }>
    >('/admin/trade', {
      page: targetPage,
      limit: 30,
      tab: targetTab,
      search: targetSearch
    })

    setLoading(false)
    if (typeof response === 'string') {
      toast.error(response)
      return
    }

    setTrades(response.trades)
    setTotal(response.total)
  }

  useEffect(() => {
    if (!isMounted) {
      return
    }
    fetchData()
  }, [activeTab, debouncedQuery, isMounted, page])

  const renderCell = (trade: TradeItem, columnKey: string) => {
    switch (columnKey) {
      case 'patch':
        return (
          <Link
            href={`/${trade.patchUniqueId}`}
            className="font-medium hover:text-primary-500"
          >
            {trade.patchName}
          </Link>
        )
      case 'resource':
        return (
          <div className="space-y-1">
            <p className="font-medium">{trade.resourceName}</p>
            <p className="text-xs text-default-500">
              资源 ID: {trade.resourceId}
            </p>
          </div>
        )
      case 'buyer':
        return renderTradeUser(trade.buyer, `买家 ID - ${trade.buyer.id}`)
      case 'seller':
        return renderTradeUser(trade.seller, `卖家 ID - ${trade.seller.id}`)
      case 'price':
        if (!isPurchaseTrade(trade)) {
          return <Chip variant="flat">-</Chip>
        }
        return (
          <Chip color="primary" variant="flat">
            {trade.price}{' '}
            {SUPPORTED_CURRENCY_CODE_MAP[trade.currencyCode] ??
              trade.currencyCode}
          </Chip>
        )
      case 'storage':
        return (
          <Chip variant="flat">
            {SUPPORTED_RESOURCE_LINK_MAP[trade.storage] ?? trade.storage}
          </Chip>
        )
      case 'access':
        return (
          <div className="flex flex-col gap-2">
            <Chip
              color={
                RESOURCE_ACCESS_STATUS_COLOR_MAP[trade.accessStatus] ??
                'default'
              }
              variant="flat"
              size="sm"
            >
              {RESOURCE_ACCESS_STATUS_MAP[trade.accessStatus] ??
                trade.accessStatus}
            </Chip>

            {isPurchaseTrade(trade) ? (
              <>
                <Chip variant="light" size="sm">
                  {RESOURCE_ACCESS_EXPIRE_MODE_MAP[trade.accessExpireMode] ??
                    trade.accessExpireMode}
                </Chip>
                <Chip variant="light" size="sm">
                  {trade.accessDurationDays
                    ? `${trade.accessDurationDays} 天`
                    : '永久或未开始'}
                </Chip>
              </>
            ) : (
              <Chip variant="light" size="sm">
                {SUPPORTED_RESOURCE_LINK_MAP[trade.storage] ?? trade.storage}
              </Chip>
            )}
          </div>
        )
      case 'time':
        if (isPurchaseTrade(trade)) {
          return (
            <div className="space-y-1 text-sm text-default-500">
              <p>
                购买于{' '}
                {formatDate(trade.purchasedAt, {
                  isShowYear: true,
                  isPrecise: true
                })}
              </p>
              <p>
                最近下载:{' '}
                {trade.lastDownloadAt
                  ? formatDate(trade.lastDownloadAt, {
                      isShowYear: true,
                      isPrecise: true
                    })
                  : '尚未下载'}
              </p>
            </div>
          )
        }

        return (
          <div className="space-y-1 text-sm text-default-500">
            <p>
              下载于{' '}
              {formatDate(trade.downloadedAt, {
                isShowYear: true,
                isPrecise: true
              })}
            </p>
            <p>
              到期:{' '}
              {trade.accessExpiresAt
                ? formatDate(trade.accessExpiresAt, {
                    isShowYear: true,
                    isPrecise: true
                  })
                : '永久有效'}
            </p>
          </div>
        )
      default:
        return <Chip variant="flat">未知</Chip>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">交易管理</h1>
        <Chip color="primary" variant="flat">
          支持按作品、资源、买家、卖家搜索
        </Chip>
      </div>

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => {
          const nextTab = key.toString() as TradeTab
          if (nextTab === activeTab) {
            return
          }
          setActiveTab(nextTab)
          setPage(1)
        }}
      >
        <Tab key="purchase" title="购买记录" />
        <Tab key="download" title="下载记录" />
      </Tabs>

      <Input
        fullWidth
        isClearable
        placeholder="输入作品名、资源名、用户名称或 ID 搜索交易记录"
        startContent={<Search className="text-default-300" size={20} />}
        value={searchQuery}
        onValueChange={(value) => {
          setSearchQuery(value)
          setPage(1)
        }}
      />

      {loading ? (
        <KunLoading hint="正在获取交易数据..." />
      ) : trades.length ? (
        <Table
          aria-label="交易管理"
          bottomContent={
            total > 30 ? (
              <div className="flex justify-center w-full">
                <KunPagination
                  total={Math.ceil(total / 30)}
                  page={page}
                  onPageChange={setPage}
                  isLoading={loading}
                />
              </div>
            ) : undefined
          }
        >
          <TableHeader columns={columns[activeTab]}>
            {(column) => (
              <TableColumn key={column.uid}>{column.name}</TableColumn>
            )}
          </TableHeader>
          <TableBody items={trades}>
            {(item) => (
              <TableRow key={`${activeTab}-${item.id}`}>
                {(columnKey) => (
                  <TableCell>
                    {renderCell(item, columnKey.toString())}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : (
        <KunNull message={getEmptyMessage(activeTab, debouncedQuery)} />
      )}
    </div>
  )
}
