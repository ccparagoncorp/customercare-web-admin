"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react"

interface UploadScoresModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface UploadResult {
  summary: {
    total: number
    success: number
    notFound: number
    errors: number
  }
  details: {
    success: Array<{ nama: string; agentId: string }>
    notFound: Array<{ nama: string }>
    errors: Array<{ nama: string; error: string }>
  }
}

export function UploadScoresModal({ isOpen, onClose, onSuccess }: UploadScoresModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validExtensions = ['.xlsx', '.xls', '.csv']
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))
      
      if (!validExtensions.includes(fileExtension)) {
        setError('File harus berformat Excel (.xlsx, .xls) atau CSV (.csv)')
        setFile(null)
        return
      }
      
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Silakan pilih file terlebih dahulu')
      return
    }

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/agents/upload-scores', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Gagal mengupload file')
        return
      }

      setResult(data)
      // Refresh agents list after successful upload (without closing modal)
      if (data.summary.success > 0) {
        onSuccess() // Only refresh data, don't close modal
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Terjadi kesalahan saat mengupload file')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#03438f]/10 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-[#03438f]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Nilai dari Excel</h2>
              <p className="text-sm text-gray-500">Upload file Excel dengan kolom: nama, qascore, quizscore, typingtestscore</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!result ? (
            <>
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih File Excel
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#03438f] transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium text-[#03438f]">
                        Klik untuk memilih file
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        atau drag and drop file di sini
                      </p>
                    </div>
                  </label>
                  {file && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">File terpilih:</span> {file.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Format Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  Format File Excel:
                </h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Baris pertama harus berisi header: <strong>nama</strong>, <strong>qascore</strong>, <strong>quizscore</strong>, <strong>typingtestscore</strong></p>
                  <p>• Nama harus sesuai dengan nama agent di database (case-insensitive)</p>
                  <p>• Nilai akan di-update untuk bulan saat ini</p>
                  <p>• Jika sudah ada data di bulan yang sama, data lama akan di-replace</p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={uploading}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="bg-[#03438f] hover:bg-[#03438f]/90 text-white"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Result Summary */}
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">Upload Selesai</p>
                      <p className="text-xs text-green-700 mt-1">
                        {result.summary.success} dari {result.summary.total} data berhasil diupload
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-900">{result.summary.success}</p>
                    <p className="text-xs text-blue-700 mt-1">Berhasil</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-900">{result.summary.notFound}</p>
                    <p className="text-xs text-yellow-700 mt-1">Tidak Ditemukan</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-900">{result.summary.errors}</p>
                    <p className="text-xs text-red-700 mt-1">Error</p>
                  </div>
                </div>

                {/* Details */}
                {result.details.notFound.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-yellow-900 mb-2">
                      Nama yang tidak ditemukan ({result.details.notFound.length}):
                    </p>
                    <div className="max-h-32 overflow-y-auto">
                      <ul className="text-sm text-yellow-800 space-y-1">
                        {result.details.notFound.map((item, idx) => (
                          <li key={idx}>• {item.nama}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {result.details.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-900 mb-2">
                      Error ({result.details.errors.length}):
                    </p>
                    <div className="max-h-32 overflow-y-auto">
                      <ul className="text-sm text-red-800 space-y-1">
                        {result.details.errors.map((item, idx) => (
                          <li key={idx}>• {item.nama}: {item.error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={handleClose}
                  className="bg-[#03438f] hover:bg-[#03438f]/90 text-white"
                >
                  Tutup
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

