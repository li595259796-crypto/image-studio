'use client'

import { useState, useTransition } from 'react'
import { Lightbulb, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { chatRefine } from '@/lib/chat-api'
import type { ScenarioId } from '@/lib/scenarios'

interface RefineDialogProps {
  scenarioId: ScenarioId
  currentDescription: string
  onApply: (refined: string) => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function RefineDialog({ scenarioId, currentDescription, onApply }: RefineDialogProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const { locale } = useLocale()
  const t = copy[locale].refine
  const st = copy[locale].scenario

  function handleOpen() {
    setMessages([])
    setInput('')
    setOpen(true)
    if (currentDescription.trim()) {
      sendMessage(currentDescription)
    }
  }

  function sendMessage(text: string) {
    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    startTransition(async () => {
      const res = await chatRefine(scenarioId, text)
      if (res.success && res.refined) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.refined! }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.error ?? 'Error' }])
      }
    })
  }

  function handleApplyLast() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    if (lastAssistant) {
      onApply(lastAssistant.content)
      setOpen(false)
    }
  }

  const hasAssistantMessage = messages.some((m) => m.role === 'assistant')

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={handleOpen}>
        <Lightbulb className="size-3.5" />
        {st.refineButton}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
            <DialogDescription className="sr-only">AI prompt refinement</DialogDescription>
          </DialogHeader>

          <div className="max-h-64 space-y-3 overflow-y-auto p-1">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'ml-auto max-w-[80%] bg-primary text-primary-foreground'
                    : 'mr-auto max-w-[80%] bg-muted'
                )}
              >
                {msg.content}
              </div>
            ))}
            {isPending && (
              <div className="mr-auto flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                <Loader2 className="size-3 animate-spin" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              className="min-h-10 resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
            />
            <Button
              size="sm"
              disabled={isPending || !input.trim()}
              onClick={() => sendMessage(input)}
            >
              <Send className="size-3.5" />
            </Button>
          </div>

          <DialogFooter>
            {hasAssistantMessage && (
              <Button size="sm" onClick={handleApplyLast}>
                {t.applyButton}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              {t.closeButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
