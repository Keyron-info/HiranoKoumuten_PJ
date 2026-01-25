// src/components/TemplateSelector.tsx
// テンプレート選択コンポーネント

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Template {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
}

interface TemplateSelectorProps {
  onSelect: (templateId: number | null) => void;
  selectedTemplateId?: number | null;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ 
  onSelect, 
  selectedTemplateId 
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/templates/', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const templateList = response.data.results || response.data;
      setTemplates(templateList);

      const defaultTemplate = templateList.find((t: Template) => t.is_default);
      if (defaultTemplate && !selectedTemplateId) {
        onSelect(defaultTemplate.id);
      }

      setLoading(false);
    } catch (error) {
      console.error('テンプレート取得エラー:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">テンプレート読み込み中...</div>;
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        請求書テンプレート
      </label>
      <select
        value={selectedTemplateId || ''}
        onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">テンプレートを選択（任意）</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
            {template.is_default && ' （デフォルト）'}
          </option>
        ))}
      </select>
      {selectedTemplateId && (
        <p className="text-sm text-gray-500 mt-1">
          {templates.find((t) => t.id === selectedTemplateId)?.description}
        </p>
      )}
    </div>
  );
};

export default TemplateSelector;