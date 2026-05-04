'use client'

import { useState } from 'react'
import { joinClassByCode } from '@/lib/actions/enrollment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function InviteCodeInput() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const result = await joinClassByCode(code)
    if (result.success) {
      setSuccess('수업에 등록되었습니다!')
      setCode('')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <div className="flex-1 space-y-1">
        <Input
          placeholder="초대 코드 6자리 입력 (예: AB12CD)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="font-mono tracking-widest"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-green-600">{success}</p>}
      </div>
      <Button type="submit" disabled={loading || code.length !== 6}>
        {loading ? '등록 중...' : '수업 등록'}
      </Button>
    </form>
  )
}
