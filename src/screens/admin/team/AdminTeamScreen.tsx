import { useState } from 'react'
import { toast } from 'sonner'
import { teamUserFixtures } from '@/data/fixtures/teamUsers'
import type { RoleName, SubTabRoute, TeamUser } from '@/data/types'
import { formatDate } from '@/lib'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Check, Clock, Key, MoreHorizontal, ShieldCheck, Users, X } from 'lucide-react'
import { AddUserModal } from './AddUserModal'

const ALL_PERMISSIONS = [
  { key: 'approve_drivers', label: 'Approve & Onboard Captains' },
  { key: 'manage_subscriptions', label: 'Manage Subscriptions & Corporate' },
  { key: 'live_ops', label: 'Live Dispatch & Interventions' },
  { key: 'manage_plans', label: 'Edit Pricing & Rate Cards' },
  { key: 'view_finance', label: 'View Financials & Margins' },
  { key: 'process_payouts', label: 'Execute Captain Payouts' },
  { key: 'release_escrow', label: 'Release Escrow Holds' },
  { key: 'apply_deductions', label: 'Apply Penalties & Deductions' },
  { key: 'manage_tickets', label: 'Support Tickets & Disputes' },
  { key: 'view_profiles', label: 'View 360° Customer Profiles' },
  { key: 'contact_users', label: 'Direct User Communication' },
  { key: 'manage_team', label: 'Administer Operators & Roles' },
  { key: 'manage_settings', label: 'System Configuration & Policy' },
]

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  Owner: ALL_PERMISSIONS.map((p) => p.key),
  'Ops Manager': [
    'approve_drivers',
    'manage_subscriptions',
    'live_ops',
    'manage_plans',
    'view_finance',
    'manage_tickets',
    'view_profiles',
    'contact_users',
  ],
  Finance: ['process_payouts', 'release_escrow', 'apply_deductions', 'view_finance', 'view_profiles'],
  Support: ['manage_tickets', 'view_profiles', 'contact_users'],
}

export function AdminTeamScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language

  const [users, setUsers] = useState<TeamUser[]>(teamUserFixtures)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [requireTwoFa, setRequireTwoFa] = useState(true)
  const [idleTimeout, setIdleTimeout] = useState('15')
  const [absoluteExpiry, setAbsoluteExpiry] = useState('12')

  const [onCallPrimary, setOnCallPrimary] = useState('USR-5')
  const [onCallSecondary, setOnCallSecondary] = useState('USR-3')

  const canWrite = shell.permissions.permissions.includes('manage_team')

  const handleAddUser = (name: string, email: string, phone: string, role: RoleName, compensationCap: number | null) => {
    const newUser: TeamUser = {
      id: `USR-${users.length + 1}`,
      name,
      email,
      phone,
      photoUrl: null,
      role,
      lastLoginAt: null,
      status: 'Invited',
      secondFactor: null,
      permissions: ROLE_PERMISSIONS[role] as any,
      compensationCapHalalas: compensationCap,
    }
    setUsers((prev) => [newUser, ...prev])
    toast.success(t('admin.toast.userInvited', { defaultValue: 'Invitation sent to {name}', name }))
  }

  const handleToggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u
        const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active'
        return { ...u, status: nextStatus as any }
      })
    )
    toast.success(t('admin.toast.statusUpdated', { defaultValue: 'Operator status updated' }))
  }

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={t('admin.team.meta', { defaultValue: 'Team operators, permissions matrix, security policy, and on-call rota' })}
          primaryAction={
            canWrite
              ? {
                  label: t('admin.team.inviteButton', { defaultValue: '+ Invite Operator' }),
                  onClick: () => setInviteOpen(true),
                }
              : undefined
          }
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-6 max-w-5xl">
        {/* 1. Team Users Roster */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {t('admin.team.rosterTitle', { defaultValue: 'Team Operators & Access' })}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('admin.team.rosterDesc', { defaultValue: 'Manage active operators, assign roles, and set compensation authority caps.' })}
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {users.length} {t('admin.operatorsCount', { defaultValue: 'operators' })}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground">
                  <tr>
                    <th className="p-3">Operator</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">2FA</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last Seen</th>
                    <th className="p-3 text-right">Comp Cap</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{user.name}</span>
                          <span className="text-[11px] text-muted-foreground">{user.email} · {user.id}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <StatusBadge tone={user.role === 'Owner' ? 'new' : user.role === 'Ops Manager' ? 'info' : 'neutral'}>
                          {user.role}
                        </StatusBadge>
                      </td>
                      <td className="p-3">
                        {user.secondFactor ? (
                          <span className="text-emerald-600 font-medium capitalize">
                            {user.secondFactor.method}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">None</span>
                        )}
                      </td>
                      <td className="p-3">
                        <StatusBadge tone={user.status === 'Active' ? 'success' : user.status === 'Invited' ? 'info' : 'neutral'}>
                          {user.status}
                        </StatusBadge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt, { language }) : 'Never'}
                      </td>
                      <td className="p-3 text-right font-medium text-foreground">
                        {user.compensationCapHalalas ? <Money amount={user.compensationCapHalalas} /> : 'Unlimited'}
                      </td>
                      <td className="p-3 text-right">
                        {canWrite && user.id !== 'USR-1' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="xs" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleStatus(user.id)}>
                                {user.status === 'Active' ? 'Deactivate Operator' : 'Activate Operator'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 2. Interactive Role Permission Matrix */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              {t('admin.team.matrixTitle', { defaultValue: 'Role Permission Matrix' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.team.matrixDesc', { defaultValue: 'Standard permission capabilities mapped across platform roles.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground">
                  <tr>
                    <th className="p-3">Capability / Permission Key</th>
                    <th className="p-3 text-center">Owner</th>
                    <th className="p-3 text-center">Ops Manager</th>
                    <th className="p-3 text-center">Finance</th>
                    <th className="p-3 text-center">Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ALL_PERMISSIONS.map((perm) => (
                    <tr key={perm.key} className="hover:bg-muted/20">
                      <td className="p-3">
                        <span className="font-medium text-foreground block">{perm.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{perm.key}</span>
                      </td>
                      {(['Owner', 'Ops Manager', 'Finance', 'Support'] as RoleName[]).map((role) => {
                        const hasPerm = (ROLE_PERMISSIONS[role] ?? []).includes(perm.key)
                        return (
                          <td key={role} className="p-3 text-center">
                            {hasPerm ? (
                              <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Security & Session Policy */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              {t('admin.team.securityTitle', { defaultValue: 'Security & Authentication Policy' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.team.securityDesc', { defaultValue: 'Enforce multi-factor authentication and session timeouts for all operators.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
              <div className="space-y-0.5">
                <span className="font-medium text-foreground block">{t('admin.enforce2Fa', { defaultValue: 'Mandatory 2FA Enrollment' })}</span>
                <span className="text-[11px] text-muted-foreground block">{t('admin.enforce2FaDesc', { defaultValue: 'Require all operators to configure TOTP Authenticator or SMS before accessing workspace.' })}</span>
              </div>
              <Switch checked={requireTwoFa} onCheckedChange={setRequireTwoFa} disabled={!canWrite} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.idleTimeout', { defaultValue: 'Idle Session Timeout (Minutes)' })}</Label>
                <Select value={idleTimeout} onValueChange={setIdleTimeout} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="60">60 Minutes (1 Hour)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.absoluteExpiry', { defaultValue: 'Absolute Session Expiry (Hours)' })}</Label>
                <Select value={absoluteExpiry} onValueChange={setAbsoluteExpiry} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8 Hours</SelectItem>
                    <SelectItem value="12">12 Hours (Standard Shift)</SelectItem>
                    <SelectItem value="24">24 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. On-Call Rota & Handover */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t('admin.team.rotaTitle', { defaultValue: 'On-Call Rota & Shift Handover' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.team.rotaDesc', { defaultValue: 'Assigned emergency on-call operators for night shifts and urgent incidents.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.primaryOnCall', { defaultValue: 'Primary On-Call Duty' })}</Label>
                <Select value={onCallPrimary} onValueChange={setOnCallPrimary} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.secondaryOnCall', { defaultValue: 'Backup Secondary Duty' })}</Label>
                <Select value={onCallSecondary} onValueChange={setOnCallSecondary} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onConfirm={handleAddUser}
        t={t}
      />
    </SingleColumnPage>
  )
}
