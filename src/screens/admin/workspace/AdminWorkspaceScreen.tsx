import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { SubTabRoute } from '@/data/types'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building, Palette, ShieldCheck } from 'lucide-react'

export function AdminWorkspaceScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir } = shell.language

  const [siteName, setSiteName] = useState('Eyvar Operations Panel')
  const [supportEmail, setSupportEmail] = useState('support@eyvar.com')
  const [supportPhone, setSupportPhone] = useState('+966 11 400 0000')
  const [timezone, setTimezone] = useState('Asia/Riyadh (UTC+03:00)')
  const [currency, setCurrency] = useState('SAR (Saudi Riyal)')
  const [brandNameEn, setBrandNameEn] = useState('Eyvar')
  const [brandNameAr, setBrandNameAr] = useState('إيفار')
  const [tosVersion, setTosVersion] = useState('v2.4 (Effective 01 June 2026)')
  const [privacyVersion, setPrivacyVersion] = useState('v1.8 (PDPL Compliant)')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const canWrite = shell.permissions.permissions.includes('manage_settings')

  useEffect(() => {
    if (isDirty && canWrite) {
      shell.setSaveBar({
        status: isSaving ? 'save-in-flight' : 'dirty',
        entity: t('admin.workspace.entity', { defaultValue: 'Workspace Settings' }),
        canSave: true,
        canDiscard: true,
        isSaving,
        onSave: async () => {
          setIsSaving(true)
          setTimeout(() => {
            setIsSaving(false)
            setIsDirty(false)
            shell.setSaveBar(null)
            toast.success(t('admin.toast.saved', { defaultValue: 'Workspace settings saved successfully' }))
          }, 300)
        },
        onDiscard: () => {
          setIsDirty(false)
          shell.setSaveBar(null)
          toast.info(t('admin.toast.discarded', { defaultValue: 'Changes discarded' }))
        },
      })
    } else {
      shell.setSaveBar(null)
    }

    return () => {
      shell.setSaveBar(null)
    }
  }, [isDirty, isSaving, canWrite, shell, t])

  const handleChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value)
    setIsDirty(true)
  }

  const handleSelectChange = (setter: (val: string) => void) => (val: string) => {
    setter(val)
    setIsDirty(true)
  }

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={t('admin.workspace.meta', { defaultValue: 'General site settings, branding, and legal consent' })}
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-6 max-w-4xl">
        {/* 1. General Configuration */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              {t('admin.general.title', { defaultValue: 'General Configuration' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.general.desc', { defaultValue: 'Core platform identity and regional defaults.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.siteName', { defaultValue: 'Site / Portal Name' })}</Label>
                <Input value={siteName} onChange={handleChange(setSiteName)} disabled={!canWrite} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.supportEmail', { defaultValue: 'Support Inquiries Email' })}</Label>
                <Input value={supportEmail} onChange={handleChange(setSupportEmail)} disabled={!canWrite} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.supportPhone', { defaultValue: 'Support Hotline' })}</Label>
                <Input value={supportPhone} onChange={handleChange(setSupportPhone)} disabled={!canWrite} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.timezone', { defaultValue: 'Default Timezone' })}</Label>
                <Select value={timezone} onValueChange={handleSelectChange(setTimezone)} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Riyadh (UTC+03:00)">Asia/Riyadh (UTC+03:00)</SelectItem>
                    <SelectItem value="Asia/Dubai (UTC+04:00)">Asia/Dubai (UTC+04:00)</SelectItem>
                    <SelectItem value="Europe/London (UTC+00:00)">Europe/London (UTC+00:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.currency', { defaultValue: 'Operating Currency' })}</Label>
                <Select value={currency} onValueChange={handleSelectChange(setCurrency)} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR (Saudi Riyal)">SAR (Saudi Riyal - ر.س)</SelectItem>
                    <SelectItem value="AED (UAE Dirham)">AED (UAE Dirham - د.إ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Branding & Identity */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              {t('admin.branding.title', { defaultValue: 'Branding & Wordmark' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.branding.desc', { defaultValue: 'Brand names across English and Arabic interfaces.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.brandEn', { defaultValue: 'Brand Name (English)' })}</Label>
                <Input value={brandNameEn} onChange={handleChange(setBrandNameEn)} disabled={!canWrite} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.brandAr', { defaultValue: 'Brand Name (Arabic)' })}</Label>
                <Input value={brandNameAr} onChange={handleChange(setBrandNameAr)} dir="rtl" disabled={!canWrite} />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-ink text-inverse flex items-center justify-center font-bold text-base">
                  EY
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Eyvar Master Logo</span>
                  <span className="text-[11px] text-muted-foreground">SVG vector logo rendered in rail header</span>
                </div>
              </div>
              {canWrite && (
                <Button variant="secondary" size="xs">
                  {t('admin.uploadNewLogo', { defaultValue: 'Upload New Logo' })}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Legal & Consent Policy */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              {t('admin.legal.title', { defaultValue: 'Legal & Consent Management' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.legal.desc', { defaultValue: 'Active versions for Terms of Service and PDPL Privacy notices.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.tosVersion', { defaultValue: 'Terms of Service Version' })}</Label>
                <Input value={tosVersion} onChange={handleChange(setTosVersion)} disabled={!canWrite} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.privacyVersion', { defaultValue: 'Privacy Notice Version' })}</Label>
                <Input value={privacyVersion} onChange={handleChange(setPrivacyVersion)} disabled={!canWrite} />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
              <div>
                <span className="font-medium text-foreground block">{t('admin.reconsent', { defaultValue: 'Trigger Mandatory Re-Consent' })}</span>
                <span className="text-[11px] text-muted-foreground">Prompt all riders and captains to re-accept updated legal terms upon next launch.</span>
              </div>
              {canWrite && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => toast.success(t('admin.toast.reconsentTriggered', { defaultValue: 'Re-consent prompt queued for all active accounts' }))}
                >
                  {t('admin.triggerPrompt', { defaultValue: 'Queue Re-consent' })}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SingleColumnPage>
  )
}
