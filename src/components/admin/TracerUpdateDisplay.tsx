"use client"

import { useEffect, useState } from "react"

interface RelatedTableInfo {
  tableName: string
  fieldName: string
  value: string
}

interface TracerUpdate {
  id: string
  sourceTable: string
  sourceKey: string
  fieldName: string
  oldValue: string | null
  newValue: string | null
  actionType: string
  changedAt: string
  changedBy: string | null
  updateNotes?: string | null // Optional, might come from source table
  relatedTableInfo?: RelatedTableInfo[] // Information about related tables
}

interface TracerUpdateDisplayProps {
  // Scope-based parameters (preferred)
  brandId?: string
  categoryId?: string
  subcategoryId?: string
  knowledgeId?: string
  sopId?: string
  qualityTrainingId?: string
  // Legacy parameters (for backward compatibility)
  sourceTable?: string
  sourceKey?: string
  title?: string
}

export function TracerUpdateDisplay({ 
  brandId,
  categoryId,
  subcategoryId,
  knowledgeId,
  sopId,
  qualityTrainingId,
  sourceTable,
  sourceKey,
  title 
}: TracerUpdateDisplayProps) {
  const [tracerUpdates, setTracerUpdates] = useState<TracerUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTracerUpdates = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Build URL with scope-based parameters
        const params = new URLSearchParams()
        if (brandId) params.append('brandId', brandId)
        else if (categoryId) params.append('categoryId', categoryId)
        else if (subcategoryId) params.append('subcategoryId', subcategoryId)
        else if (knowledgeId) params.append('knowledgeId', knowledgeId)
        else if (sopId) params.append('sopId', sopId)
        else if (qualityTrainingId) params.append('qualityTrainingId', qualityTrainingId)
        else if (sourceTable) {
          params.append('sourceTable', sourceTable)
          if (sourceKey) params.append('sourceKey', sourceKey)
        }

        const url = `/api/tracer-updates?${params.toString()}`
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setTracerUpdates(data)
        } else if (response.status === 503) {
          // Service unavailable - database connection issue
          // Return empty array to show "no updates" message instead of error
          setTracerUpdates([])
        } else {
          setError('Failed to fetch tracer updates')
        }
      } catch (err) {
        // For network errors, show empty array instead of error
        // This provides better UX when database is unreachable
        console.warn('Error fetching tracer updates:', err)
        setTracerUpdates([])
      } finally {
        setLoading(false)
      }
    }

    fetchTracerUpdates()
  }, [brandId, categoryId, subcategoryId, knowledgeId, sopId, qualityTrainingId, sourceTable, sourceKey])

  const formatTableName = (tableName: string) => {
    // Convert snake_case to Title Case
    return tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading tracer updates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {title || 'Tracer Updates'}
            </h2>
            <p className="text-sm text-gray-600">
              Riwayat perubahan data dan informasi terkait
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Scope
            </div>
            <div className="text-sm font-medium text-gray-700">
              {brandId && `Brand`}
              {categoryId && `Category`}
              {subcategoryId && `Subcategory`}
              {knowledgeId && `Knowledge`}
              {sopId && `SOP`}
              {qualityTrainingId && `Quality Training`}
              {sourceTable && !brandId && !categoryId && !subcategoryId && !knowledgeId && !sopId && !qualityTrainingId && formatTableName(sourceTable)}
            </div>
          </div>
        </div>
      </div>

      {tracerUpdates.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Perubahan</h3>
            <p className="text-gray-500">Belum ada tracer updates untuk record ini.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {tracerUpdates.map((update, index) => (
            <div
              key={update.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              {/* Header Card with Action Type */}
              <div className={`px-6 py-4 border-b ${
                update.actionType.toUpperCase() === 'INSERT' || update.actionType.toUpperCase() === 'CREATE' 
                  ? 'bg-green-50 border-green-200' 
                  : update.actionType.toUpperCase() === 'UPDATE'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-4 py-2 rounded-lg text-sm font-bold border-2 shadow-sm ${
                        update.actionType.toUpperCase() === 'INSERT' || update.actionType.toUpperCase() === 'CREATE'
                          ? 'bg-green-500 text-white border-green-600'
                          : update.actionType.toUpperCase() === 'UPDATE'
                          ? 'bg-blue-500 text-white border-blue-600'
                          : 'bg-red-500 text-white border-red-600'
                      }`}
                    >
                      {update.actionType.toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatTableName(update.sourceTable)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Record #{index + 1}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Waktu Perubahan
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {formatDate(update.changedAt)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Related Table Information */}
                {update.relatedTableInfo && update.relatedTableInfo.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                        Informasi Tabel Terkait
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {update.relatedTableInfo.map((info, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-white/60 rounded-lg p-3 border border-blue-100">
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-blue-900 text-sm">{info.tableName}</span>
                              <span className="text-blue-600">•</span>
                              <span className="text-blue-700 text-sm font-medium">{info.fieldName}</span>
                              <span className="text-blue-500 font-bold">=</span>
                              <span className="text-blue-900 font-semibold text-sm break-words">{info.value}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Field Name Section */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded bg-gray-400 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Field yang Berubah</span>
                  </div>
                  <div className="text-base font-mono font-semibold text-gray-900 bg-white px-4 py-3 rounded border-2 border-gray-300">
                    {update.fieldName}
                  </div>
                </div>

                {/* Old and New Values */}
                {(update.oldValue !== null || update.newValue !== null) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {update.oldValue !== null && update.oldValue !== undefined && (
                      <div className="bg-red-50 rounded-lg border-2 border-red-200 overflow-hidden">
                        <div className="bg-red-500 px-4 py-2.5 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-white"></div>
                          <span className="text-sm font-bold text-white uppercase tracking-wide">Nilai Lama</span>
                        </div>
                        <div className="p-4 text-sm text-gray-800 break-words whitespace-pre-wrap max-h-64 overflow-y-auto bg-white/50">
                          {update.oldValue || <span className="text-gray-400 italic">(kosong)</span>}
                        </div>
                      </div>
                    )}
                    {update.newValue !== null && update.newValue !== undefined && (
                      <div className="bg-green-50 rounded-lg border-2 border-green-200 overflow-hidden">
                        <div className="bg-green-500 px-4 py-2.5 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-white"></div>
                          <span className="text-sm font-bold text-white uppercase tracking-wide">Nilai Baru</span>
                        </div>
                        <div className="p-4 text-sm text-gray-800 break-words whitespace-pre-wrap max-h-64 overflow-y-auto bg-white/50">
                          {update.newValue || <span className="text-gray-400 italic">(kosong)</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Update Notes */}
                {update.updateNotes && (
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-yellow-900 uppercase tracking-wide">
                        Catatan Update
                      </h3>
                    </div>
                    <div className="text-sm text-yellow-900 whitespace-pre-wrap break-words max-h-48 overflow-y-auto bg-white/60 rounded p-4 border border-yellow-200">
                      {update.updateNotes}
                    </div>
                  </div>
                )}

                {/* Footer: Changed By and Source Key */}
                <div className="pt-4 border-t-2 border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {update.changedBy && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-md">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                            Diubah Oleh
                          </div>
                          <div className="text-sm font-bold text-gray-900">
                            {update.changedBy}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-gray-500 uppercase tracking-wide">Record ID:</span>
                      <span className="font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-300">
                        {update.sourceKey}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

