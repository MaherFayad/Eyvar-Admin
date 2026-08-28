import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, Send } from 'lucide-react'
import type { Translate } from '@/lib'

interface PushComposerModalProps {
  open: boolean
  onClose: () => void
  onSend: (title: string, body: string, audience: string, deepLink: string) => void
  t: Translate
}

export function PushComposerModal({ open, onClose, onSend, t }: PushComposerModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all_captains')
  const [deepLink, setDeepLink] = useState('eyvar://subscriptions')
  const [busy, setBusy] = useState(false)

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return
    setBusy(true)
    setTimeout(() => {
      onSend(title.trim(), body.trim(), audience, deepLink.trim())
      setBusy(false)
      setTitle('')
      setBody('')
      onClose()
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            {t('admin.push.composeTitle', { defaultValue: 'Compose Operational Push Notification' })}
          </DialogTitle>
          <DialogDescription>
            {t('admin.push.composeDesc', { defaultValue: 'Broadcast instant push message to active drivers or riders.' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('admin.push.audience', { defaultValue: 'Target Audience' })}</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_captains">All Active Captains (Riyadh & Jeddah)</SelectItem>
                <SelectItem value="online_captains">Captains Currently Online</SelectItem>
                <SelectItem value="all_riders">All Registered Riders</SelectItem>
                <SelectItem value="active_subs">Active Subscription Riders</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('admin.push.msgTitle', { defaultValue: 'Notification Title' })} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Surge Alert: Riyadh Northern Ring Rd" required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('admin.push.msgBody', { defaultValue: 'Message Body' })} *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="High demand near KAFD. 1.4x surge bonus active for the next 45 minutes."
              rows={3}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('admin.push.deepLink', { defaultValue: 'In-App Deep Link' })}</Label>
            <Input value={deepLink} onChange={(e) => setDeepLink(e.target.value)} placeholder="eyvar://demand-map" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('action.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            size="xs"
            onClick={handleSend}
            disabled={!title.trim() || !body.trim() || busy}
            className="gap-1"
          >
            <Send className="h-3 w-3" />
            {busy ? t('action.saving', { defaultValue: 'Broadcasting...' }) : t('admin.push.broadcast', { defaultValue: 'Broadcast Push' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
