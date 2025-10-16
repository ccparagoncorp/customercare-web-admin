"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, BookOpen, Plus, Trash2, Upload } from "lucide-react"
import knowledgeContent from "@/content/knowledge.json"

interface AddKnowledgeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newKnowledge?: any) => void
}

interface DetailField {
  id: string
  name: string
  description: string
  logoFile?: File
  logoUrl?: string
}

export function AddKnowledgeModal({ isOpen, onClose, onSuccess }: AddKnowledgeModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    logoFile: null as File | null,
    createdBy: "",
    updatedBy: ""
  })
  const [details, setDetails] = useState<DetailField[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { form } = knowledgeContent

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Nama knowledge harus diisi"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Deskripsi knowledge harus diisi"
    }

    if (!formData.createdBy.trim()) {
      newErrors.createdBy = "Dibuat oleh harus diisi"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title.trim())
      formDataToSend.append('description', formData.description.trim())
      
      if (formData.logoFile) {
        formDataToSend.append('logo', formData.logoFile)
      }
      formDataToSend.append('createdBy', formData.createdBy.trim())
      
      // Attach detail files and a pared-down details descriptor
      const detailsForServer = details.map((d, idx) => {
        if (d.logoFile) {
          formDataToSend.append(`detailLogo_${idx}`, d.logoFile as File)
        }
        return {
          index: idx,
          name: d.name,
          description: d.description || ''
          // logoUrl will be resolved server-side
        }
      })
      formDataToSend.append('details', JSON.stringify(detailsForServer))

      const response = await fetch('/api/knowledge', {
        method: 'POST',
        body: formDataToSend
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Gagal menambah knowledge')
      }

      const result = await response.json()
      
      // Reset form
      resetForm()

      onSuccess(result.knowledge)
      onClose()
      
    } catch (error) {
      console.error('Error adding knowledge:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Terjadi kesalahan' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addDetailField = () => {
    const newDetail: DetailField = {
      id: Date.now().toString(),
      name: "",
      description: "",
      logoFile: undefined
    }
    setDetails(prev => [...prev, newDetail])
  }

  const removeDetailField = (id: string) => {
    setDetails(prev => prev.filter(detail => detail.id !== id))
  }

  const updateDetailField = (id: string, field: keyof DetailField, value: string | File | undefined) => {
    setDetails(prev => prev.map(detail => 
      detail.id === id ? { ...detail, [field]: value } : detail
    ))
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "", 
      logoFile: null,
      createdBy: "",
      updatedBy: ""
    })
    setDetails([])
    setErrors({})
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#03438f]/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-[#03438f]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{form.title}</h2>
              <p className="text-sm text-gray-600">{form.subtitle}</p>
            </div>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              {form.fields.title.label} *
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder={form.fields.title.placeholder}
              className={errors.title ? 'border-red-500 focus:border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              {form.fields.description.label} *
            </Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={form.fields.description.placeholder}
              rows={6}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent resize-none ${
                errors.description ? 'border-red-500 focus:border-red-500' : ''
              }`}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Logo Field */}
          <div className="space-y-2">
            <Label htmlFor="logo" className="text-sm font-medium text-gray-700">
              {form.fields.logo.label}
            </Label>
            <div className="relative">
              <input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(e) => handleInputChange('logoFile', e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="logo"
                className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200 group"
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-gray-100 rounded-full group-hover:bg-[#03438f]/10 transition-colors">
                    <Upload className="h-6 w-6 text-gray-400 group-hover:text-[#03438f] transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {formData.logoFile ? 'File dipilih' : 'Klik untuk upload logo'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.logoFile ? formData.logoFile.name : 'PNG, JPG, GIF hingga 10MB'}
                    </p>
                  </div>
                </div>
              </label>
            </div>
            {formData.logoFile && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <img 
                    src={URL.createObjectURL(formData.logoFile)} 
                    alt="Preview" 
                    className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{formData.logoFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(formData.logoFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange('logoFile', null)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detail Knowledge Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Detail Knowledge</h3>
              <Button
                type="button"
                onClick={addDetailField}
                variant="outline"
                size="sm"
                className="text-[#03438f] border-[#03438f] hover:bg-[#03438f] hover:text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                {form.buttons.addDetail}
              </Button>
            </div>

            {details.map((detail, index) => (
              <div key={detail.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Detail {index + 1}</h4>
                  <Button
                    type="button"
                    onClick={() => removeDetailField(detail.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    {form.detailFields.name.label}
                  </Label>
                  <Input
                    value={detail.name}
                    onChange={(e) => updateDetailField(detail.id, 'name', e.target.value)}
                    placeholder={form.detailFields.name.placeholder}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    {form.detailFields.description.label}
                  </Label>
                  <textarea
                    value={detail.description}
                    onChange={(e) => updateDetailField(detail.id, 'description', e.target.value)}
                    placeholder={form.detailFields.description.placeholder}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    {form.detailFields.logo.label}
                  </Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => updateDetailField(detail.id, 'logoFile', e.target.files?.[0])}
                      className="hidden"
                      id={`detail-logo-${detail.id}`}
                    />
                    <label
                      htmlFor={`detail-logo-${detail.id}`}
                      className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200 group"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="p-2 bg-gray-100 rounded-full group-hover:bg-[#03438f]/10 transition-colors">
                          <Upload className="h-4 w-4 text-gray-400 group-hover:text-[#03438f] transition-colors" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-900">
                            {detail.logoFile ? 'File dipilih' : 'Upload logo detail'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {detail.logoFile ? detail.logoFile.name : 'PNG, JPG, GIF'}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                  {detail.logoFile && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={URL.createObjectURL(detail.logoFile)} 
                          alt="Preview" 
                          className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-900">{detail.logoFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(detail.logoFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateDetailField(detail.id, 'logoFile', undefined)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Created By */}
          <div className="space-y-2">
            <Label htmlFor="createdBy" className="text-sm font-medium text-gray-700">
              Dibuat oleh *
            </Label>
            <Input
              id="createdBy"
              type="text"
              value={formData.createdBy}
              onChange={(e) => handleInputChange('createdBy', e.target.value)}
              placeholder="Nama admin pembuat"
              className={errors.createdBy ? 'border-red-500 focus:border-red-500' : ''}
            />
            {errors.createdBy && (
              <p className="text-sm text-red-600">{errors.createdBy}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {form.buttons.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#03438f] hover:bg-[#012f65] text-white px-6"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{form.buttons.submitting}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{form.buttons.submit}</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
