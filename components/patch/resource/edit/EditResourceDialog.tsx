'use client'

import { Button } from '@heroui/button'
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from '@heroui/react'
import { useState } from 'react'
import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { kunFetchPut } from '~/utils/kunFetch'
import { patchResourceCreateSchema } from '~/validations/patch'
import { DEFAULT_TRADE_CURRENCY_CODE } from '~/constants/currency'
import { ResourceLinksInput } from '../publish/ResourceLinksInput'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import { ResourceDetailsForm } from '../publish/ResourceDetailsForm'
import { ResourceSectionSelect } from '../publish/ResourceSectionSelect'
import type { PatchResource } from '~/types/api/patch'
import type { PatchResourceFormData, PatchResourceFormOutput } from '../share'

type EditResourceFormData = PatchResourceFormData

const getDefaultValues = (resource: PatchResource): EditResourceFormData => ({
  patchId: resource.patchId,
  section: resource.section,
  name: resource.name,
  note: resource.note,
  type: resource.type,
  language: resource.language,
  platform: resource.platform,
  links: resource.links.map((link) => ({
    id: link.id,
    storage: link.storage,
    hash: link.hash,
    content: link.content,
    size: link.size,
    code: link.code,
    password: link.password
  })),
  enableSale: !!resource.sale,
  saleCurrencyCode: resource.sale?.currencyCode ?? DEFAULT_TRADE_CURRENCY_CODE,
  salePrice: resource.sale?.price ?? 0,
  saleAccessExpireMode: resource.sale?.accessExpireMode ?? 'never',
  saleAccessDurationDays: resource.sale?.accessDurationDays ?? null
})

interface EditResourceDialogProps {
  resource: PatchResource
  onClose: () => void
  onSuccess: (resource: PatchResource) => void
  type?: 'patch' | 'admin'
}

export const EditResourceDialog = ({
  resource,
  onClose,
  onSuccess,
  type = 'patch'
}: EditResourceDialogProps) => {
  const [editing, setEditing] = useState(false)
  const [uploadingResource, setUploadingResource] = useState(false)

  const {
    control,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<EditResourceFormData, any, PatchResourceFormOutput>({
    resolver: zodResolver(patchResourceCreateSchema) as Resolver<
      EditResourceFormData,
      any,
      PatchResourceFormOutput
    >,
    defaultValues: getDefaultValues(resource)
  })

  useEffect(() => {
    reset(getDefaultValues(resource))
  }, [resource, reset])

  const handleUpdateResource = async () => {
    setEditing(true)
    const res = await kunFetchPut<KunResponse<PatchResource>>(
      `/${type}/resource`,
      { resourceId: resource.id, ...watch() }
    )
    kunErrorHandler(res, (value) => {
      reset()
      onSuccess(value)
      toast.success('资源更新成功')
    })
    setEditing(false)
  }

  return (
    <ModalContent>
      <ModalHeader className="flex-col space-y-2">
        <h3 className="text-lg">更改资源链接</h3>
        <p className="text-sm font-medium text-default-500">
          若您想要更改您的对象存储链接, 您现在可以直接上传新文件,
          系统会自动更新云端文件, 无需删除后重新发布
        </p>
      </ModalHeader>

      <ModalBody>
        <form className="space-y-6">
          <ResourceSectionSelect
            errors={errors}
            section={watch().section}
            setSection={(content) => setValue('section', content)}
          />

          <ResourceLinksInput
            control={control}
            errors={errors}
            setValue={setValue}
            watch={watch}
            section={watch().section}
            setUploadingResource={setUploadingResource}
          />
          <ResourceDetailsForm control={control} errors={errors} />
        </form>
      </ModalBody>

      <ModalFooter>
        <Button color="danger" variant="light" onPress={onClose}>
          取消
        </Button>
        <Button
          color="primary"
          disabled={editing || uploadingResource}
          isLoading={editing || uploadingResource}
          onPress={handleUpdateResource}
        >
          {editing
            ? '更新中...'
            : uploadingResource
              ? '正在上传补丁资源中...'
              : '保存'}
        </Button>
      </ModalFooter>
    </ModalContent>
  )
}
