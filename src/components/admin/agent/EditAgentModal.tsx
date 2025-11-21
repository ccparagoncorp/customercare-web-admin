"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Save, Clock, Info } from "lucide-react"

interface AgentScores {
  id: string
  name: string
  foto?: string | null
  qaScore?: number
  quizScore?: number
  typingTestScore?: number
  afrt?: number
  art?: number
  rt?: number
  rr?: number
  csat?: number
}

interface EditAgentModalProps {
  isOpen: boolean
  agent: AgentScores | null
  onClose: () => void
  onUpdated: (agent: AgentScores) => void
}

export function EditAgentModal({ isOpen, agent, onClose, onUpdated }: EditAgentModalProps) {
  const [formData, setFormData] = useState({
    qaScore: 0,
    quizScore: 0,
    typingTestScore: 0,
    afrt: 0,
    art: 0,
    rt: 0,
    rr: 0,
    csat: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (agent) {
      setFormData({
        qaScore: agent.qaScore ?? 0,
        quizScore: agent.quizScore ?? 0,
        typingTestScore: agent.typingTestScore ?? 0,
        afrt: agent.afrt ?? 0,
        art: agent.art ?? 0,
        rt: agent.rt ?? 0,
        rr: agent.rr ?? 0,
        csat: agent.csat ?? 0
      })
      setError(null)
    }
  }, [agent])

  if (!isOpen || !agent) {
    return null
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const num = Number(value)
    setFormData((prev) => ({
      ...prev,
      [field]: Number.isFinite(num) ? num : 0
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/agents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: agent.id,
          qaScore: formData.qaScore,
          quizScore: formData.quizScore,
          typingTestScore: formData.typingTestScore,
          afrt: formData.afrt,
          art: formData.art,
          rt: formData.rt,
          rr: formData.rr,
          csat: formData.csat
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || "Gagal memperbarui agent")
      }

      const result = await response.json()
      onUpdated(result.agent)
      onClose()
    } catch (err) {
      console.error("Error updating agent:", err)
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Nilai Agent</h2>
            <p className="text-sm text-gray-500">{agent.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Info Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">Penyimpanan Otomatis</p>
              <p className="text-xs text-blue-700">
                Nilai yang Anda simpan akan tersimpan sebagai record baru dengan timestamp otomatis. 
                Riwayat performa agent dapat dilihat di histori performa.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qaScore">QA Score</Label>
            <Input
              id="qaScore"
              type="number"
              value={formData.qaScore}
              onChange={(e) => handleInputChange("qaScore", e.target.value)}
              min={0}
              max={100}
              placeholder="Masukkan nilai QA Score"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quizScore">Quiz Score</Label>
            <Input
              id="quizScore"
              type="number"
              value={formData.quizScore}
              onChange={(e) => handleInputChange("quizScore", e.target.value)}
              min={0}
              max={100}
              placeholder="Masukkan nilai Quiz Score"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="typingScore">Typing Test Score</Label>
            <Input
              id="typingScore"
              type="number"
              value={formData.typingTestScore}
              onChange={(e) => handleInputChange("typingTestScore", e.target.value)}
              min={0}
              max={100}
              placeholder="Masukkan nilai Typing Test Score"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="afrt">AFRT</Label>
              <Input
                id="afrt"
                type="number"
                value={formData.afrt}
                onChange={(e) => handleInputChange("afrt", e.target.value)}
                min={0}
                placeholder="Masukkan nilai AFRT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="art">ART</Label>
              <Input
                id="art"
                type="number"
                value={formData.art}
                onChange={(e) => handleInputChange("art", e.target.value)}
                min={0}
                placeholder="Masukkan nilai ART"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt">RT</Label>
              <Input
                id="rt"
                type="number"
                value={formData.rt}
                onChange={(e) => handleInputChange("rt", e.target.value)}
                min={0}
                placeholder="Masukkan nilai RT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rr">RR</Label>
              <Input
                id="rr"
                type="number"
                value={formData.rr}
                onChange={(e) => handleInputChange("rr", e.target.value)}
                min={0}
                placeholder="Masukkan nilai RR"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="csat">CSAT</Label>
              <Input
                id="csat"
                type="number"
                value={formData.csat}
                onChange={(e) => handleInputChange("csat", e.target.value)}
                min={0}
                max={100}
                placeholder="Masukkan nilai CSAT"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Timestamp akan tersimpan otomatis</span>
            </div>
            <div className="flex items-center space-x-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-[#03438f] text-white">
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Menyimpan...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Simpan Nilai</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

