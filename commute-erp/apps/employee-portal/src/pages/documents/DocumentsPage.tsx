// =====================================================
// 문서 작성 페이지
// =====================================================

import { useState, useEffect } from 'react';
import { FileText, Plus, Printer, Save, Send, Trash2, Eye } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import {
  getDocumentTemplates,
  getDocumentTemplate,
  createDocumentRequest,
  updateDocumentRequest,
  getMyDocumentRequests,
  deleteDocumentRequest,
  cancelDocumentRequest,
  generateAutoFillData,
} from '../../lib/api';
import type { DocumentTemplate, DocumentRequest, TemplateField } from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CATEGORY_LABELS: Record<string, string> = {
  leave: '휴가',
  business_trip: '출장',
  overtime: '연장근무',
  expense: '지출',
  other: '기타',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  pending: '승인대기',
  approved: '승인완료',
  rejected: '반려',
  cancelled: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function DocumentsPage() {
  const { employee } = useAuthStore();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [myRequests, setMyRequests] = useState<DocumentRequest[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [templatesData, requestsData] = await Promise.all([
        getDocumentTemplates(),
        getMyDocumentRequests(employee?.id || ''),
      ]);
      setTemplates(templatesData);
      setMyRequests(requestsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('데이터 로드 실패');
    }
    setIsLoading(false);
  };

  const handleCreateDocument = async (template: DocumentTemplate) => {
    const autoFillData = generateAutoFillData(employee!);
    const initialData: Record<string, any> = {};
    
    // 자동 채우기 필드 설정
    template.fields.forEach((field: TemplateField) => {
      if (field.auto_fill && autoFillData[field.auto_fill]) {
        initialData[field.name] = autoFillData[field.auto_fill];
      } else {
        initialData[field.name] = '';
      }
    });

    setSelectedTemplate(template);
    setFormData(initialData);
    setShowForm(true);
  };

  const handleSave = async (status: 'draft' | 'pending') => {
    if (!selectedTemplate || !employee) return;
    
    setIsSaving(true);
    try {
      const title = `${selectedTemplate.name} - ${format(new Date(), 'yyyy-MM-dd')}`;
      await createDocumentRequest(
        selectedTemplate.id,
        employee.id,
        title,
        selectedTemplate.category,
        formData,
        status
      );
      
      toast.success(status === 'draft' ? '임시저장 완료' : '제출 완료');
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('저장 실패');
    }
    setIsSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await deleteDocumentRequest(id);
      toast.success('삭제됨');
      loadData();
    } catch (error) {
      toast.error('삭제 실패');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('취소하시겠습니까?')) return;
    try {
      await cancelDocumentRequest(id);
      toast.success('취소됨');
      loadData();
    } catch (error) {
      toast.error('취소 실패');
    }
  };

  const renderField = (field: TemplateField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            rows={3}
            required={field.required}
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            required={field.required}
          >
            <option value="">선택하세요</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      case 'date':
      case 'time':
      case 'number':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            required={field.required}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            required={field.required}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (showForm && selectedTemplate) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none">
          <div className="flex items-center justify-between mb-6 print:hidden">
            <h1 className="text-2xl font-bold">{selectedTemplate.name}</h1>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {selectedTemplate.fields.map((field: TemplateField) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => handleSave('draft')}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              <Save size={18} />
              임시저장
            </button>
            <button
              onClick={() => handleSave('pending')}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              <Send size={18} />
              제출하기
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 ml-auto"
            >
              <Printer size={18} />
              인쇄
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">문서 작성</h1>
      </div>

      {/* 템플릿 선택 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">신청 가능한 문서</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleCreateDocument(template)}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="text-primary-600" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{template.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{CATEGORY_LABELS[template.category]}</p>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 내 문서 목록 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">내 문서</h2>
        <div className="space-y-3">
          {myRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">작성한 문서가 없습니다</p>
          ) : (
            myRequests.map((req) => (
              <div key={req.id} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{req.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(req.created_at), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {req.status === 'draft' && (
                      <button
                        onClick={() => handleDelete(req.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                    {req.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
