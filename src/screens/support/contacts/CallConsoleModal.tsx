import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Phone, PhoneCall, PhoneOff } from 'lucide-react'
import type { Translate } from '@/lib'

interface CallConsoleModalProps {
  open: boolean
  onClose: () => void
  onComplete: (callerName: string, reasonCode: string, notes: string, durationSeconds: number) => void
  t: Translate
}

export function CallConsoleModal({ open, onClose, onComplete, t }: CallConsoleModalProps) {
  const [callerName, setCallerName] = useState('Sara Al-Otaibi (+966 54 111 2233)')
  const [reasonCode, setReasonCode] = useState('fare_dispute')
  const [notes, setNotes] = useState('')
  const [callActive, setCallActive] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let timer: any
    if (callActive && open) {
      timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    }
    return () => clearInterval(timer)
  }, [callActive, open])

  const handleStartCall = () => {
    setCallActive(true)
    setSeconds(0)
  }

  const handleEndCall = () => {
    setCallActive(false)
  }

  const handleSave = () => {
    onComplete(callerName, reasonCode, notes, seconds)
    setCallActive(false)
    setSeconds(0)
    setNotes('')
    onClose()
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-emerald-600" />
            {t('contacts.console.title', { defaultValue: 'Support Call Console' })}
          </DialogTitle>
          <DialogDescription>
            {t('contacts.console.desc', { defaultValue: 'Record caller details, live call duration, and wrap-up coding.' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          {/* Call Status & Timer Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${callActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              <span className="font-semibold text-foreground">
                {callActive ? t('contacts.callInProgress', { defaultValue: 'Call in Progress' }) : t('contacts.callIdle', { defaultValue: 'Call Ready' })}
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-foreground">{formatTimer(seconds)}</span>
            {callActive ? (
              <Button size="xs" variant="destructive" onClick={handleEndCall} className="gap-1">
                <PhoneOff className="h-3 w-3" />
                {t('contacts.hangup', { defaultValue: 'End Call' })}
              </Button>
            ) : (
              <Button size="xs" onClick={handleStartCall} className="gap-1">
                <Phone className="h-3 w-3" />
                {t('contacts.startCall', { defaultValue: 'Connect' })}
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('contacts.caller', { defaultValue: 'Caller Name & Contact' })}</Label>
            <Input
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              placeholder="e.g. Abdullah Al-Otaibi (+966 50 123 4567)"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('contacts.reasonCode', { defaultValue: 'Wrap-up Reason Code' })}</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fare_dispute">fare_dispute (Fare / Toll / Surge)</SelectItem>
                <SelectItem value="captain_absence">captain_absence (Missed Departure)</SelectItem>
                <SelectItem value="lost_item">lost_item (Lost Property)</SelectItem>
                <SelectItem value="app_bug">app_bug (App Technical Issue)</SelectItem>
                <SelectItem value="policy_inquiry">policy_inquiry (General Policy Question)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('contacts.callNotes', { defaultValue: 'Wrap-up Notes' })}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Caller summarized issue regarding..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose}>
            {t('action.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            size="xs"
            onClick={handleSave}
            disabled={callActive}
          >
            {t('contacts.saveLog', { defaultValue: 'Save & Log Contact' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
