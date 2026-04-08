import { Checkbox } from '@heroui/react'
import { Controller, useWatch } from 'react-hook-form'
import { Input, Textarea } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import {
  DEFAULT_TRADE_CURRENCY_CODE,
  RESOURCE_ACCESS_EXPIRE_MODE,
  RESOURCE_ACCESS_EXPIRE_MODE_MAP,
  SUPPORTED_CURRENCY_CODE,
  SUPPORTED_CURRENCY_CODE_MAP
} from '~/constants/currency'
import {
  resourceTypes,
  SUPPORTED_LANGUAGE,
  SUPPORTED_LANGUAGE_MAP,
  SUPPORTED_PLATFORM,
  SUPPORTED_PLATFORM_MAP
} from '~/constants/resource'
import { ControlType, ErrorType } from '../share'

interface ResourceDetailsFormProps {
  control: ControlType
  errors: ErrorType
}

export const ResourceDetailsForm = ({
  control,
  errors
}: ResourceDetailsFormProps) => {
  const enableSale = useWatch({ control, name: 'enableSale' })
  const saleAccessExpireMode = useWatch({
    control,
    name: 'saleAccessExpireMode'
  })

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">资源详情</h3>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              isRequired
              label="类型"
              placeholder="请选择资源的类型"
              selectionMode="multiple"
              selectedKeys={field.value}
              onSelectionChange={(key) => {
                field.onChange([...key] as string[])
              }}
              isInvalid={!!errors.type}
              errorMessage={errors.type?.message}
            >
              {resourceTypes.map((type) => (
                <SelectItem key={type.value} textValue={type.label}>
                  <div className="flex flex-col">
                    <span className="text">{type.label}</span>
                    <span className="text-small text-default-500">
                      {type.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </Select>
          )}
        />

        <Controller
          name="language"
          control={control}
          render={({ field }) => (
            <Select
              isRequired
              label="语言"
              placeholder="请选择语言"
              selectionMode="multiple"
              selectedKeys={field.value}
              onSelectionChange={(key) => {
                field.onChange([...key] as string[])
              }}
              isInvalid={!!errors.language}
              errorMessage={errors.language?.message}
            >
              {SUPPORTED_LANGUAGE.map((lang) => (
                <SelectItem key={lang}>
                  {SUPPORTED_LANGUAGE_MAP[lang]}
                </SelectItem>
              ))}
            </Select>
          )}
        />

        <Controller
          name="platform"
          control={control}
          render={({ field }) => (
            <Select
              isRequired
              label="平台"
              placeholder="请选择资源的平台"
              selectionMode="multiple"
              selectedKeys={field.value}
              onSelectionChange={(key) => {
                field.onChange([...key] as string[])
              }}
              isInvalid={!!errors.platform}
              errorMessage={errors.platform?.message}
            >
              {SUPPORTED_PLATFORM.map((platform) => (
                <SelectItem key={platform}>
                  {SUPPORTED_PLATFORM_MAP[platform]}
                </SelectItem>
              ))}
            </Select>
          )}
        />
      </div>

      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            label="资源名称"
            placeholder="请填写您的资源名称, 例如 DeepSeek V3 翻译补丁"
            isInvalid={!!errors.name}
            errorMessage={errors.name?.message}
          />
        )}
      />

      <Controller
        name="note"
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            label="备注"
            placeholder="您可以在此处随意添加备注, 例如资源的注意事项等"
            isInvalid={!!errors.note}
            errorMessage={errors.note?.message}
          />
        )}
      />

      <div className="space-y-3 rounded-large border border-default-200 p-4">
        <Controller
          name="enableSale"
          control={control}
          render={({ field }) => (
            <Checkbox isSelected={field.value} onValueChange={field.onChange}>
              开启资源售卖
            </Checkbox>
          )}
        />

        {enableSale && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Controller
              name="saleCurrencyCode"
              control={control}
              render={({ field }) => (
                <Select
                  label="交易币种"
                  selectedKeys={field.value ? [field.value] : []}
                  onSelectionChange={(keys) => {
                    field.onChange(
                      Array.from(keys)[0]?.toString() ??
                        DEFAULT_TRADE_CURRENCY_CODE
                    )
                  }}
                  isInvalid={!!errors.saleCurrencyCode}
                  errorMessage={errors.saleCurrencyCode?.message}
                >
                  {SUPPORTED_CURRENCY_CODE.map((code) => (
                    <SelectItem key={code}>
                      {SUPPORTED_CURRENCY_CODE_MAP[code]}
                    </SelectItem>
                  ))}
                </Select>
              )}
            />

            <Controller
              name="salePrice"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  label="售卖价格"
                  min={0}
                  value={String(field.value ?? 0)}
                  onValueChange={(value) => field.onChange(Number(value || 0))}
                  isInvalid={!!errors.salePrice}
                  errorMessage={errors.salePrice?.message}
                />
              )}
            />

            <Controller
              name="saleAccessExpireMode"
              control={control}
              render={({ field }) => (
                <Select
                  label="授权模式"
                  selectedKeys={field.value ? [field.value] : []}
                  onSelectionChange={(keys) => {
                    field.onChange(Array.from(keys)[0]?.toString() ?? 'never')
                  }}
                  isInvalid={!!errors.saleAccessExpireMode}
                  errorMessage={errors.saleAccessExpireMode?.message}
                >
                  {RESOURCE_ACCESS_EXPIRE_MODE.map((mode) => (
                    <SelectItem key={mode}>
                      {RESOURCE_ACCESS_EXPIRE_MODE_MAP[mode]}
                    </SelectItem>
                  ))}
                </Select>
              )}
            />

            {saleAccessExpireMode !== 'never' && (
              <Controller
                name="saleAccessDurationDays"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    label="有效天数"
                    min={1}
                    value={field.value == null ? '' : String(field.value)}
                    onValueChange={(value) => {
                      field.onChange(value === '' ? null : Number(value))
                    }}
                    isInvalid={!!errors.saleAccessDurationDays}
                    errorMessage={errors.saleAccessDurationDays?.message}
                  />
                )}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
